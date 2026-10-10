// Un FpPrint de libfprint no es un FMD ANSI: se etiqueta para evitar mezclar motores.
export function templateFormat(value: string, mode: 'hardware' | 'simulation'): string | null {
  if (mode === 'simulation') return /^SIMULATED-FMD:[a-zA-Z0-9_-]{1,100}$/.test(value) ? 'SIMULATION-v1' : null;
  const prefix = 'LIBFPRINT-v1:';
  if (value.startsWith(prefix)) {
    const data = value.slice(prefix.length);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
    const bytes = Buffer.from(data, 'base64');
    return bytes.length >= 32 && bytes.length <= 40000 && bytes.toString('base64') === data ? 'LIBFPRINT-v1' : null;
  }
  return value.includes('<') && !/<!DOCTYPE|<!ENTITY/i.test(value) ? 'ANSI-FMD-XML' : null;
}
