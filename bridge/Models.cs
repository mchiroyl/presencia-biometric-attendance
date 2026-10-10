namespace SchoolBridge;
public sealed class BridgeOptions
{
    public string SecretToken { get; set; } = "";
    public string DeviceToken { get; set; } = "";
    public string SigningKey { get; set; } = "";
    public string DeviceId { get; set; } = "local-reader-01";
    public string ApiUrl { get; set; } = "http://127.0.0.1:3000";
    public string ListenUrl { get; set; } = "ws://127.0.0.1:8080";
    public string[] AllowedOrigins { get; set; } = [];
    public bool Simulation { get; set; }
    public int CaptureTimeoutMs { get; set; } = 10000;
}
public sealed record CaptureAssertion(string DeviceId, string EmployeeId, string CaptureId, string CapturedAt, string Mode, string Signature);
public sealed record TemplateRecord(string EmployeeId, string Fmd, string Mode);
