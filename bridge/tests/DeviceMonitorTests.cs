using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Xunit;
namespace SchoolBridge.Tests;
public class DeviceMonitorTests
{
    private sealed class ControlledDevice : IBiometricDevice
    {
        public string Mode => "hardware";
        public DeviceStatus Status = new("disconnected", false);
        public int Captures;
        public Task<DeviceStatus> GetStatusAsync(CancellationToken ct) => Task.FromResult(Status);
        public Task<string> CaptureFmdAsync(CancellationToken ct) { Captures++; throw new InvalidOperationException(); }
        public Task<string> EnrollFmdAsync(CancellationToken ct) => CaptureFmdAsync(ct);
        public bool Matches(string a, string b) => false;
        public void Dispose() {}
    }
    [Fact]
    public async Task AuthorizedClientReceivesHotPlugStatesWithoutBiometricsAndCannotCaptureUnavailableDevice()
    {
        var options = new BridgeOptions { SecretToken = new string('s', 32), ListenUrl = "ws://127.0.0.1:8083", AllowedOrigins = ["http://localhost:5173"] };
        using var device = new ControlledDevice(); using var backend = new BackendClient(options); using var server = new WebSocketServerService(options, device, backend);
        server.Start(); using var socket = new ClientWebSocket(); using var ct = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        socket.Options.SetRequestHeader("Origin", "http://localhost:5173");
        await socket.ConnectAsync(new Uri(options.ListenUrl + "/?token=" + options.SecretToken), ct.Token);
        async Task<JsonElement> ReadUntil(string type, string? state = null, ClientWebSocket? target = null)
        {
            var buffer = new byte[4096];
            while (true)
            {
                var result = await (target ?? socket).ReceiveAsync(new ArraySegment<byte>(buffer), ct.Token);
                Assert.Equal(WebSocketMessageType.Text, result.MessageType);
                using var document = JsonDocument.Parse(Encoding.UTF8.GetString(buffer, 0, result.Count));
                var message = document.RootElement.Clone(); Assert.False(message.TryGetProperty("fmd", out _));
                if (message.GetProperty("type").GetString() == type && (state == null || message.GetProperty("state").GetString() == state)) return message;
            }
        }
        await ReadUntil("ready"); await ReadUntil("device-status", "disconnected");
        using var observer = new ClientWebSocket(); observer.Options.SetRequestHeader("Origin", "http://localhost:5173");
        await observer.ConnectAsync(new Uri(options.ListenUrl + "/?token=" + options.SecretToken), ct.Token);
        await ReadUntil("ready", target: observer); await ReadUntil("device-status", "disconnected", observer);
        await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes("{\"type\":\"scan\"}")), WebSocketMessageType.Text, true, ct.Token);
        Assert.Equal("DEVICE_NOT_READY", (await ReadUntil("error")).GetProperty("code").GetString()); Assert.Equal(0, device.Captures);
        device.Status = new("sdk-required", false);
        await Task.Delay(250, ct.Token);
        await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes("{\"type\":\"scan\"}")), WebSocketMessageType.Text, true, ct.Token);
        Assert.False((await ReadUntil("device-status", "sdk-required", observer)).GetProperty("available").GetBoolean());
        Assert.False((await ReadUntil("device-status", "sdk-required")).GetProperty("available").GetBoolean());
        device.Status = new("available", true); Assert.True((await ReadUntil("device-status", "available")).GetProperty("available").GetBoolean());
        device.Status = new("disconnected", false); Assert.False((await ReadUntil("device-status", "disconnected")).GetProperty("available").GetBoolean());
    }
}
