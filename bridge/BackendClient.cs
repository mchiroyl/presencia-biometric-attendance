using System.Net.Http.Json;
using System.Text.Json;
namespace SchoolBridge;
public sealed class BackendClient : IDisposable
{
    private readonly HttpClient http;
    public BackendClient(BridgeOptions options)
    {
        http = new HttpClient { BaseAddress = new Uri(options.ApiUrl), Timeout = TimeSpan.FromSeconds(15) };
        http.DefaultRequestHeaders.Add("X-Device-Token", options.DeviceToken);
    }
    public async Task<TemplateRecord[]> Templates(CancellationToken ct) => await http.GetFromJsonAsync<TemplateRecord[]>("/device/templates", ct) ?? [];
    public async Task<string> Enroll(string ticket, string fmd, string mode, CancellationToken ct)
    {
        using var response = await http.PostAsJsonAsync("/device/enrollments", new { ticket, fmd, mode }, ct);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("El backend rechazó el enrolamiento; revise consentimiento, ticket y modo");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        return json.RootElement.GetProperty("employeeId").GetString()!;
    }
    public void Dispose() => http.Dispose();
}
