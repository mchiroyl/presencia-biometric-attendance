using System.Text.Json;
using System.Text.Json.Nodes;
using SchoolBridge;
try
{
    var settingsRoot = AppContext.BaseDirectory;
    var node = JsonNode.Parse(File.ReadAllText(Path.Combine(settingsRoot, "appsettings.json")))!.AsObject();
    var options = node.Deserialize<BridgeOptions>()!;
    var environment = LocalEnvironment.ReadRoot();
    options.SecretToken = environment["VITE_BRIDGE_TOKEN"];
    options.DeviceToken = environment["DEVICE_TOKEN"];
    options.SigningKey = environment["DEVICE_SIGNING_KEY"];
    options.DeviceId = environment["DEVICE_ID"];
    if (args.Contains("--hardware") && args.Contains("--simulate")) throw new InvalidOperationException("Modos incompatibles");
    if (args.Contains("--hardware")) options.Simulation = false;
    if (args.Contains("--simulate")) options.Simulation = true;
    if (options.SecretToken.Length < 24 || !System.Text.RegularExpressions.Regex.IsMatch(options.DeviceToken, "^[a-fA-F0-9]{64}$") || !System.Text.RegularExpressions.Regex.IsMatch(options.SigningKey, "^[a-fA-F0-9]{64}$")) throw new InvalidOperationException("Ejecute npm run setup para configurar secretos");
    if (options.ListenUrl != "ws://127.0.0.1:8080" || !Uri.TryCreate(options.ApiUrl, UriKind.Absolute, out var api) || !api.IsLoopback || api.Scheme != "http") throw new InvalidOperationException("Solo direcciones locales autorizadas");
    if (options.AllowedOrigins.Length == 0 || options.AllowedOrigins.Any(o => o is not ("http://localhost:5173" or "http://127.0.0.1:5173"))) throw new InvalidOperationException("Orígenes inválidos");
    if (options.CaptureTimeoutMs is < 1000 or > 30000) throw new InvalidOperationException("Timeout inválido");
    var index = Array.IndexOf(args, "--fingerprint");
    var fingerprint = index >= 0 && index + 1 < args.Length ? args[index + 1] : "demo-finger-01";
    if (!System.Text.RegularExpressions.Regex.IsMatch(fingerprint, "^[a-zA-Z0-9_-]{1,100}$")) throw new InvalidOperationException("Identificador de simulación inválido");
    using IBiometricDevice device = options.Simulation ? new SimulationDevice(fingerprint) : new BiometricDeviceService(options.CaptureTimeoutMs);
    using var backend = new BackendClient(options);
    using var ws = new WebSocketServerService(options, device, backend);
    using var stop = new ManualResetEventSlim(false);
    Console.CancelKeyPress += (_, e) => { e.Cancel = true; stop.Set(); };
    ws.Start();
    Console.WriteLine($"Puente local en {options.ListenUrl}; modo: {device.Mode}. Ctrl+C para terminar.");
    if (options.Simulation) Console.WriteLine("SIMULACIÓN ACTIVA: no hay captura de hardware. Backend debe permitir simulación explícitamente.");
    else Console.WriteLine("Detección USB automática activa. Disponible únicamente después de verificar controlador, SDK y apertura del lector.");
    stop.Wait();
}
catch (Exception e)
{
    Console.Error.WriteLine(e is PlatformNotSupportedException ? e.Message : "No se pudo iniciar el puente. Revise configuración, SDK y disponibilidad del puerto.");
    Environment.ExitCode = 1;
}
