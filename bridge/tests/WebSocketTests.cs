using Xunit;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
namespace SchoolBridge.Tests;
public class WebSocketTests
{
    [Fact]
    public async Task RealFleckConnectionEnforcesTokenOriginAndCommandLimits()
    {
        var options = new BridgeOptions { SecretToken = new string('s', 32), DeviceToken = new string('d', 64), SigningKey = new string('a', 64), ListenUrl = "ws://127.0.0.1:8082", AllowedOrigins = ["http://localhost:5173"] };
        using var device = new SimulationDevice("test"); using var backend = new BackendClient(options); using var server = new WebSocketServerService(options, device, backend); server.Start();
        using var ct = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        async Task<WebSocketReceiveResult> Read(ClientWebSocket ws, byte[] buffer) => await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct.Token);
        foreach (var (token, origin) in new[] { ("wrong", "http://localhost:5173"), (options.SecretToken, "https://evil.example") })
        {
            using var socket = new ClientWebSocket(); socket.Options.SetRequestHeader("Origin", origin);
            await socket.ConnectAsync(new Uri(options.ListenUrl + "/?token=" + token), ct.Token);
            try { var result = await Read(socket, new byte[2048]); Assert.Equal(WebSocketMessageType.Close, result.MessageType); }
            catch (WebSocketException) { Assert.Equal(WebSocketState.Aborted, socket.State); } // Fleck puede cerrar TCP inmediatamente; ningún ready es aceptable.
        }
        using var valid = new ClientWebSocket(); valid.Options.SetRequestHeader("Origin", "http://localhost:5173");
        await valid.ConnectAsync(new Uri(options.ListenUrl + "/?token=" + options.SecretToken), ct.Token);
        var buffer = new byte[2048]; var ready = await Read(valid, buffer);
        Assert.Equal("ready", JsonDocument.Parse(Encoding.UTF8.GetString(buffer, 0, ready.Count)).RootElement.GetProperty("type").GetString());
        var status = await Read(valid, buffer);
        Assert.Equal("device-status", JsonDocument.Parse(Encoding.UTF8.GetString(buffer, 0, status.Count)).RootElement.GetProperty("type").GetString());
        await valid.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes("{\"type\":\"forbidden\"}")), WebSocketMessageType.Text, true, ct.Token);
        var rejected = await Read(valid, buffer);
        Assert.Equal("INVALID_COMMAND", JsonDocument.Parse(Encoding.UTF8.GetString(buffer, 0, rejected.Count)).RootElement.GetProperty("code").GetString());
        await Task.Delay(250, ct.Token);
        await valid.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(new string('x', 4097))), WebSocketMessageType.Text, true, ct.Token);
        try { var closed = await Read(valid, buffer); Assert.Equal(WebSocketMessageType.Close, closed.MessageType); }
        catch (WebSocketException) { Assert.Equal(WebSocketState.Aborted, valid.State); }
    }
}
