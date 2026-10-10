namespace SchoolBridge;
// Estado operativo, sin número de serie, identificadores USB ni información biométrica.
public sealed record DeviceStatus(string State, bool Available);
public static class DeviceReadiness
{
    public static DeviceStatus Resolve(int count, bool driverHealthy, bool sdkInstalled, bool opened)
    {
        var state = count == 0 ? "disconnected" : count > 1 ? "ambiguous" : !driverHealthy ? "driver-required" : !sdkInstalled ? "sdk-required" : !opened ? "not-ready" : "available";
        return new(state, state == "available");
    }
}
