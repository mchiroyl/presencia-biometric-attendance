using Xunit;
namespace SchoolBridge.Tests;
public class DeviceReadinessTests
{
    [Theory]
    [InlineData(0, true, true, false, "disconnected")]
    [InlineData(1, false, true, false, "driver-required")]
    [InlineData(1, true, false, false, "sdk-required")]
    [InlineData(1, true, true, false, "not-ready")]
    [InlineData(1, true, true, true, "available")]
    [InlineData(2, true, true, true, "ambiguous")]
    public void NeverEquatesUsbPresenceWithCaptureReadiness(int count, bool driver, bool sdk, bool opened, string expected)
    {
        var status = DeviceReadiness.Resolve(count, driver, sdk, opened);
        Assert.Equal(expected, status.State);
        Assert.Equal(expected == "available", status.Available);
    }
}
