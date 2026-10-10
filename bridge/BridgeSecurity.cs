using System.Security.Cryptography;
using System.Text;
namespace SchoolBridge;
public static class BridgeSecurity
{
    public static bool Authorize(string path, string origin, BridgeOptions options)
    {
        if (!options.AllowedOrigins.Contains(origin, StringComparer.Ordinal)) return false;
        if (!Uri.TryCreate("http://127.0.0.1" + path, UriKind.Absolute, out var uri) || uri.AbsolutePath != "/") return false;
        try
        {
            var values = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries)
                .Select(part => part.Split('=', 2))
                .Where(part => Uri.UnescapeDataString(part[0]) == "token")
                .Select(part => part.Length == 2 ? Uri.UnescapeDataString(part[1].Replace("+", " ")) : "").ToArray();
            if (values.Length != 1) return false;
            var expected = Encoding.UTF8.GetBytes(options.SecretToken); var actual = Encoding.UTF8.GetBytes(values[0]);
            try { return actual.Length == expected.Length && CryptographicOperations.FixedTimeEquals(actual, expected); }
            finally { CryptographicOperations.ZeroMemory(actual); CryptographicOperations.ZeroMemory(expected); }
        }
        catch { return false; }
    }
    public static string Sign(CaptureAssertion value, string key)
    {
        var bytes = Encoding.UTF8.GetBytes(string.Join('\n', value.DeviceId, value.EmployeeId, value.CaptureId, value.CapturedAt, value.Mode));
        var secret = Convert.FromHexString(key);
        try { return Convert.ToHexString(HMACSHA256.HashData(secret, bytes)).ToLowerInvariant(); }
        finally { CryptographicOperations.ZeroMemory(secret); CryptographicOperations.ZeroMemory(bytes); }
    }
}
