using System.Security.Cryptography;
#if DIGITALPERSONA_SDK
using DPUruNet;
#endif
namespace SchoolBridge;
public sealed class BiometricDeviceService : IBiometricDevice
{
    public string Mode => "hardware";
#if DIGITALPERSONA_SDK
    private Reader? reader;
    private string? readerName;
    private readonly int timeout;
    public BiometricDeviceService(int captureTimeoutMs)
    {
        timeout = captureTimeoutMs;
    }
    public async Task<DeviceStatus> GetStatusAsync(CancellationToken ct)
    {
        var usb = await WindowsDeviceDiscovery.Observe(ct);
        if (usb.Count != 1 || !usb.DriverHealthy) { CloseReader(); return DeviceReadiness.Resolve(usb.Count, usb.DriverHealthy, true, false); }
        try
        {
            var readers = ReaderCollection.GetReaders();
            if (readers.Count != 1) { CloseReader(); return DeviceReadiness.Resolve(readers.Count, true, true, false); }
            var name = readers[0].Description.Name;
            if (reader == null || name != readerName)
            {
                CloseReader(); reader = readers[0]; readerName = name;
                if (reader.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE) != Constants.ResultCode.DP_SUCCESS) { CloseReader(); return new("not-ready", false); }
            }
            if (reader.GetStatus() != Constants.ResultCode.DP_SUCCESS) { CloseReader(); return new("not-ready", false); }
            return DeviceReadiness.Resolve(1, true, true, reader.Status.Status == Constants.ReaderStatuses.DP_STATUS_READY);
        }
        catch { CloseReader(); return new("not-ready", false); }
    }
    private void CloseReader() { try { reader?.Dispose(); } catch { } reader = null; readerName = null; }
    private Fmd Capture(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (reader == null) throw new InvalidOperationException("El lector no está disponible");
        var result = reader.Capture(Constants.Formats.Fid.ANSI, Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT, timeout, reader.Capabilities.Resolutions[0]);
        try
        {
            ct.ThrowIfCancellationRequested();
            if (result.ResultCode != Constants.ResultCode.DP_SUCCESS || result.Data == null || result.Quality != Constants.CaptureQuality.DP_QUALITY_GOOD)
                throw new InvalidOperationException("Captura incompleta; retire el dedo y vuelva a intentar");
            var extraction = FeatureExtraction.CreateFmdFromFid(result.Data, Constants.Formats.Fmd.ANSI);
            if (extraction.ResultCode != Constants.ResultCode.DP_SUCCESS || extraction.Data == null)
                throw new InvalidOperationException("No se pudo extraer la plantilla FMD");
            return extraction.Data;
        }
        finally
        {
            // FID contiene la imagen: jamás se serializa, guarda o envía. Limpieza best effort
            // de los arrays que el SDK expone; no garantiza borrar copias nativas internas.
            if (result.Data?.Bytes is { } imageBytes) CryptographicOperations.ZeroMemory(imageBytes);
        }
    }
    public Task<string> CaptureFmdAsync(CancellationToken ct) => Task.Run(() =>
    {
        var fmd = Capture(ct);
        try { return Fmd.SerializeXml(fmd); }
        finally { if (fmd.Bytes is { } bytes) CryptographicOperations.ZeroMemory(bytes); }
    }, ct);
    public Task<string> EnrollFmdAsync(CancellationToken ct) => Task.Run(() =>
    {
        var samples = new List<Fmd>();
        try
        {
            for (var i = 0; i < 8; i++)
            {
                Console.WriteLine($"Enrolamiento: coloque el mismo dedo, muestra {i + 1}. Retírelo entre muestras.");
                samples.Add(Capture(ct));
                var result = Enrollment.CreateEnrollmentFmd(Constants.Formats.Fmd.ANSI, samples);
                if (result.ResultCode == Constants.ResultCode.DP_SUCCESS && result.Data != null)
                {
                    try { return Fmd.SerializeXml(result.Data); }
                    finally { if (result.Data.Bytes is { } bytes) CryptographicOperations.ZeroMemory(bytes); }
                }
                Thread.Sleep(700); ct.ThrowIfCancellationRequested();
            }
            throw new InvalidOperationException("No se logró un conjunto válido de enrolamiento");
        }
        finally { foreach (var sample in samples) if (sample.Bytes is { } bytes) CryptographicOperations.ZeroMemory(bytes); }
    }, ct);
    public bool Matches(string probe, string enrolled)
    {
        var a = Fmd.DeserializeXml(probe); var b = Fmd.DeserializeXml(enrolled);
        try
        {
            var match = Comparison.Compare(a, 0, b, 0);
            // Umbral de referencia FAR 1/100000. La calibración física queda en pruebas de aceptación.
            return match.ResultCode == Constants.ResultCode.DP_SUCCESS && match.Score < 2147483647 / 100000;
        }
        finally
        {
            if (a.Bytes is { } x) CryptographicOperations.ZeroMemory(x);
            if (b.Bytes is { } y) CryptographicOperations.ZeroMemory(y);
        }
    }
    public void Dispose() { CloseReader(); }
#else
    public BiometricDeviceService(int captureTimeoutMs) { }
    public async Task<DeviceStatus> GetStatusAsync(CancellationToken ct)
    {
        var usb = await WindowsDeviceDiscovery.Observe(ct);
        return DeviceReadiness.Resolve(usb.Count, usb.DriverHealthy, false, false);
    }
    public Task<string> CaptureFmdAsync(CancellationToken ct) => throw new PlatformNotSupportedException();
    public Task<string> EnrollFmdAsync(CancellationToken ct) => throw new PlatformNotSupportedException();
    public bool Matches(string probe, string enrolled) => throw new PlatformNotSupportedException();
    public void Dispose() { }
#endif
}
