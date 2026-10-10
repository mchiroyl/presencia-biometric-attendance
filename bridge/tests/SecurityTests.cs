using Xunit;
using System.Security.Cryptography;
using System.Text;
namespace SchoolBridge.Tests;
public class SecurityTests
{
    private static BridgeOptions Options => new() { SecretToken = "Secret+&?", AllowedOrigins = ["http://localhost:5173"] };
    [Fact] public void AcceptsEncodedTokenAndExactOrigin() => Assert.True(BridgeSecurity.Authorize("/?token=Secret%2B%26%3F", "http://localhost:5173", Options));
    [Theory]
    [InlineData("/?token=wrong", "http://localhost:5173")]
    [InlineData("/", "http://localhost:5173")]
    [InlineData("/?token=Secret%2B%26%3F", "https://evil.example")]
    [InlineData("/?token=Secret%2B%26%3F", "")]
    [InlineData("/?token=Secret%2B%26%3F&token=wrong", "http://localhost:5173")]
    public void RejectsInvalidConnection(string path, string origin) => Assert.False(BridgeSecurity.Authorize(path, origin, Options));
    [Fact] public void SignatureMatchesBackendCanonicalFormat()
    {
        var key = new string('a', 64);
        var capture = new CaptureAssertion("local-reader-01", "employee", "capture", "2026-10-10T12:00:00.000Z", "hardware", "");
        var expected = Convert.ToHexString(HMACSHA256.HashData(Convert.FromHexString(key), Encoding.UTF8.GetBytes("local-reader-01\nemployee\ncapture\n2026-10-10T12:00:00.000Z\nhardware"))).ToLowerInvariant();
        Assert.Equal(expected, BridgeSecurity.Sign(capture, key));
    }
}
