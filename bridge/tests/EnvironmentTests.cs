using Xunit;
namespace SchoolBridge.Tests;
public class EnvironmentTests
{
    [Fact]
    public void ParsesQuotedValuesWithoutExecutingOrExpandingSecrets()
    {
        var values = LocalEnvironment.Parse("# comment\nDEVICE_TOKEN=abc=123\nVITE_BRIDGE_TOKEN='secret#value'\nBOOTSTRAP_ADMIN_PASSWORD=\"literal$HOME\"\n");
        Assert.Equal("abc=123", values["DEVICE_TOKEN"]);
        Assert.Equal("secret#value", values["VITE_BRIDGE_TOKEN"]);
        Assert.Equal("literal$HOME", values["BOOTSTRAP_ADMIN_PASSWORD"]);
        var literal = LocalEnvironment.Parse("PATH_SAMPLE='a\\b'\nQUOTE_SAMPLE=`a'\"$#`\n");
        Assert.Equal("a\\b", literal["PATH_SAMPLE"]);
        Assert.Equal("a'\"$#", literal["QUOTE_SAMPLE"]);
    }
    [Fact]
    public void RejectsDuplicateKeysAndUnterminatedQuotes()
    {
        Assert.Throws<FormatException>(() => LocalEnvironment.Parse("DEVICE_TOKEN=a\nDEVICE_TOKEN=b"));
        Assert.Throws<FormatException>(() => LocalEnvironment.Parse("DEVICE_TOKEN=\"missing"));
    }
}
