namespace SchoolBridge;
// Adaptador de pruebas, activado solo mediante --simulate; no representa una lectura física.
public sealed class SimulationDevice(string fingerprint) : IBiometricDevice
{
    public string Mode => "simulation";
    public Task<DeviceStatus> GetStatusAsync(CancellationToken ct) => Task.FromResult(new DeviceStatus("available", true));
    public async Task<string> CaptureFmdAsync(CancellationToken ct) { await Task.Delay(300, ct); return "SIMULATED-FMD:" + fingerprint; }
    public Task<string> EnrollFmdAsync(CancellationToken ct) => CaptureFmdAsync(ct);
    public bool Matches(string probe, string enrolled) => probe == enrolled;
    public void Dispose() { }
}
