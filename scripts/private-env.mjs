import { writeFileSync, existsSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import { resolve } from 'node:path';
export function serializeEnvironment(values) {
  const lines = Object.entries(values).map(([key, input]) => {
    const value = String(input);
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || /[\r\n]/.test(value)) throw new Error('Clave o formato de configuración no admitido');
    const quote = ["'", '`', '"'].find(character => !value.includes(character) && (character !== '"' || !/\\[nr]/.test(value)));
    if (!quote) throw new Error('Valor no representable sin alterar el formato dotenv; no se modifica el archivo');
    return `${key}=${quote}${value}${quote}`;
  });
  const content = '# Configuración privada local. No versionar ni compartir. VITE_* es público en el navegador.\n' + lines.join('\n') + '\n';
  const parsed = dotenv.parse(content);
  for (const [key, value] of Object.entries(values)) if (parsed[key] !== String(value)) throw new Error('La configuración no conserva sus valores; no se modifica el archivo');
  return content;
}
export function writePrivateEnvironment(path, values) {
  const content = serializeEnvironment(values);
  // Protege primero el archivo vacío; nunca escribe nuevos secretos con ACL heredada.
  if (!existsSync(path)) writeFileSync(path, '', { mode: 0o600, flag: 'wx' });
  if (process.platform === 'win32') {
    // Reemplaza toda la ACL, incluyendo grants explícitos anteriores. No interpolar rutas en código.
    const script = "$ErrorActionPreference='Stop'; $acl=[System.Security.AccessControl.FileSecurity]::new(); $acl.SetAccessRuleProtection($true,$false); $owner=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; $acl.SetOwner($owner); foreach($sid in @($owner,[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) { $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::FullControl,[System.Security.AccessControl.AccessControlType]::Allow)) }; [System.IO.File]::SetAccessControl($env:SCHOOL_PRIVATE_ENV_PATH,$acl)";
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'pipe', windowsHide: true, env: { ...process.env, SCHOOL_PRIVATE_ENV_PATH: resolve(path) } });
  }
  else chmodSync(path, 0o600);
  writeFileSync(path, content, { mode: 0o600 });
}
