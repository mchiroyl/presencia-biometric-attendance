export async function api(path, { token, method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined, signal, cache: 'no-store' });
  } catch (error) { if (error.name === 'AbortError') throw error; throw new Error('No se pudo conectar con el servidor local.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event('auth-expired'));
    throw new Error(Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo completar la operación.');
  }
  return data;
}
export const bridgeErrors = { CAPTURE_TIMEOUT: 'El tiempo de captura terminó sin completar la huella. Coloque el mismo dedo varias veces, retírelo entre muestras y vuelva a intentarlo.', DEVICE_NOT_READY: 'El lector no está disponible para capturar. Revise la conexión USB y el estado del servicio biométrico.', DUPLICATE_FINGERPRINT: 'Esta huella ya está registrada para otro empleado. Revise su identidad antes de continuar.', NO_MATCH: 'Huella no reconocida. Consulte al administrador.', AMBIGUOUS_MATCH: 'Huella registrada en más de un empleado. Revise los registros.', BUSY: 'El lector está ocupado. Espere un momento.', RATE_LIMIT: 'Espere antes de volver a solicitar una lectura.', CAPTURE_FAILED: 'No se completó la captura. Revise el lector, el ticket y el servidor.', INVALID_COMMAND: 'El comando no está permitido.' };
