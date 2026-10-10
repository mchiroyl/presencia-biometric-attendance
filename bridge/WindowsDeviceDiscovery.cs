using System.Diagnostics;
using System.Text.Json;
namespace SchoolBridge;
public sealed record UsbReaderObservation(int Count, bool DriverHealthy);
public static class WindowsDeviceDiscovery
{
    public static async Task<UsbReaderObservation> Observe(CancellationToken ct)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException();
        // Consulta fija y local. No recibe argumentos del navegador ni ejecuta instaladores.
        // VID 05BA corresponde al lector U.are.U; se incluye el nombre para drivers HID.
        const string script = @"$ErrorActionPreference='Stop'; $r=@(Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like 'USB\VID_05BA*' -or $_.FriendlyName -match 'DigitalPersona|U\.are\.U' }); @{ Count=$r.Count; DriverHealthy=(@($r | Where-Object { $_.Status -ne 'OK' }).Count -eq 0) } | ConvertTo-Json -Compress";
        var start = new ProcessStartInfo("powershell.exe") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in new[] { "-NoProfile", "-NonInteractive", "-Command", script }) start.ArgumentList.Add(argument);
        using var process = Process.Start(start) ?? throw new InvalidOperationException();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(12));
        var output = process.StandardOutput.ReadToEndAsync(timeout.Token);
        var error = process.StandardError.ReadToEndAsync(timeout.Token);
        try
        {
            await process.WaitForExitAsync(timeout.Token);
            var json = await output; await error;
            if (process.ExitCode != 0) throw new InvalidOperationException("No se pudo consultar Plug and Play");
            return JsonSerializer.Deserialize<UsbReaderObservation>(json) ?? throw new InvalidOperationException();
        }
        finally { if (!process.HasExited) process.Kill(entireProcessTree: true); }
    }
}
