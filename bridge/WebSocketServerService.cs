using Fleck;
using System.Text.Json;
using System.Collections.Concurrent;
namespace SchoolBridge;
public sealed class WebSocketServerService : IDisposable
{
    private readonly WebSocketServer server;
    private readonly BridgeOptions options;
    private readonly IBiometricDevice device;
    private readonly BackendClient backend;
    private readonly SemaphoreSlim captureLock = new(1, 1);
    private readonly CancellationTokenSource shutdown = new();
    private readonly ConcurrentDictionary<IWebSocketConnection, byte> clients = new();
    private DeviceStatus currentStatus = new("checking", false);
    private Task? monitoring;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public WebSocketServerService(BridgeOptions settings, IBiometricDevice biometric, BackendClient client)
    {
        options = settings; device = biometric; backend = client;
        // Nunca registrar la URL: el query string contiene SECRET_TOKEN.
        FleckLog.LogAction = (_, _, _) => { };
        server = new WebSocketServer(settings.ListenUrl);
    }
    public void Start()
    {
        monitoring = MonitorDevice();
        server.Start(socket =>
    {
        var authorized = false;
        var lifetime = CancellationTokenSource.CreateLinkedTokenSource(shutdown.Token);
        var lastCommand = DateTimeOffset.MinValue;
        socket.OnOpen = () =>
        {
            // Zero Trust local: OnOpen no habilita captura hasta validar token Y Origin.
            // Fleck ya negoció el upgrade; se cierra inmediatamente al fallar la autorización.
            // El token visible de React es una barrera local, no una identidad administrativa.
            authorized = BridgeSecurity.Authorize(socket.ConnectionInfo.Path, socket.ConnectionInfo.Origin, options);
            if (!authorized) { socket.Close(); return; }
            clients.TryAdd(socket, 0);
            Send(socket, new { type = "ready", mode = device.Mode });
            SendStatus(socket);
        };
        socket.OnClose = () => { authorized = false; clients.TryRemove(socket, out _); lifetime.Cancel(); };
        socket.OnError = error => { authorized = false; clients.TryRemove(socket, out _); lifetime.Cancel(); };
        socket.OnBinary = _ => socket.Close();
        socket.OnMessage = message =>
        {
            if (!authorized || message.Length > 4096) { socket.Close(); return; }
            if (DateTimeOffset.UtcNow - lastCommand < TimeSpan.FromMilliseconds(200)) { Send(socket, new { type = "error", code = "RATE_LIMIT" }); return; }
            lastCommand = DateTimeOffset.UtcNow;
            _ = Handle(socket, message, lifetime.Token);
        };
        });
    }
    private void SendStatus(IWebSocketConnection socket)
    {
        var status = currentStatus;
        Send(socket, new { type = "device-status", mode = device.Mode, state = status.State, available = status.Available });
    }
    private void PublishStatus(DeviceStatus status)
    {
        if (status == currentStatus) return;
        currentStatus = status;
        foreach (var client in clients.Keys) SendStatus(client);
    }
    private async Task MonitorDevice()
    {
        while (!shutdown.IsCancellationRequested)
        {
            try
            {
                if (await captureLock.WaitAsync(0, shutdown.Token))
                {
                    try
                    {
                        var status = await device.GetStatusAsync(shutdown.Token);
                        PublishStatus(status);
                    }
                    finally { captureLock.Release(); }
                }
                await Task.Delay(2000, shutdown.Token);
            }
            catch (OperationCanceledException) when (shutdown.IsCancellationRequested) { return; }
            catch
            {
                PublishStatus(new("error", false));
                try { await Task.Delay(2000, shutdown.Token); } catch (OperationCanceledException) { return; }
            }
        }
    }
    private async Task Handle(IWebSocketConnection socket, string message, CancellationToken ct)
    {
        var locked = false;
        try
        {
            using var command = JsonDocument.Parse(message, new JsonDocumentOptions { MaxDepth = 8 });
            var type = command.RootElement.GetProperty("type").GetString();
            if (type == "status") { SendStatus(socket); return; }
            if (type is not ("scan" or "enroll")) { Send(socket, new { type = "error", code = "INVALID_COMMAND" }); return; }
            locked = await captureLock.WaitAsync(0, ct);
            if (!locked) { Send(socket, new { type = "error", code = "BUSY" }); return; }
            PublishStatus(await device.GetStatusAsync(ct));
            SendStatus(socket);
            if (!currentStatus.Available) { Send(socket, new { type = "error", code = "DEVICE_NOT_READY" }); return; }
            Send(socket, new { type = "capturing", operation = type });
            if (type == "enroll")
            {
                var ticket = command.RootElement.GetProperty("ticket").GetString();
                if (string.IsNullOrWhiteSpace(ticket) || ticket.Length > 2048) throw new InvalidOperationException();
                var fmd = await device.EnrollFmdAsync(ct);
                var employeeId = await backend.Enroll(ticket, fmd, device.Mode, ct);
                Send(socket, new { type = "enrolled", employeeId });
            }
            else
            {
                var probe = await device.CaptureFmdAsync(ct);
                var templates = await backend.Templates(ct);
                // Comparación biométrica real en DPUruNet; el navegador nunca recibe FMD.
                var matches = templates.Where(t => t.Mode == device.Mode && !t.Fmd.StartsWith("LIBFPRINT-v1:", StringComparison.Ordinal) && device.Matches(probe, t.Fmd)).Take(2).ToArray();
                if (matches.Length != 1) { Send(socket, new { type = "error", code = matches.Length == 0 ? "NO_MATCH" : "AMBIGUOUS_MATCH" }); return; }
                var assertion = new CaptureAssertion(options.DeviceId, matches[0].EmployeeId, Guid.NewGuid().ToString(), DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"), device.Mode, "");
                assertion = assertion with { Signature = BridgeSecurity.Sign(assertion, options.SigningKey) };
                Send(socket, new { type = "matched", assertion });
            }
        }
        catch (OperationCanceledException) { }
        catch { PublishStatus(new("not-ready", false)); Send(socket, new { type = "error", code = "CAPTURE_FAILED" }); }
        finally { if (locked) captureLock.Release(); }
    }
    private static void Send(IWebSocketConnection socket, object payload)
    {
        try { if (socket.IsAvailable) _ = socket.Send(JsonSerializer.Serialize(payload, Json)); } catch { }
    }
    public void Dispose() { shutdown.Cancel(); server.Dispose(); try { monitoring?.GetAwaiter().GetResult(); captureLock.Wait(); captureLock.Release(); } catch { } }
}
