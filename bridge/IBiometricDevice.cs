namespace SchoolBridge;
public interface IBiometricDevice : IDisposable
{
    string Mode { get; }
    Task<DeviceStatus> GetStatusAsync(CancellationToken cancellationToken);
    Task<string> CaptureFmdAsync(CancellationToken cancellationToken);
    Task<string> EnrollFmdAsync(CancellationToken cancellationToken);
    bool Matches(string probe, string enrolled);
}
