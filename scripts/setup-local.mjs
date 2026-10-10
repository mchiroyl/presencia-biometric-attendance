// Genera secretos independientes; nunca imprime credenciales ni reemplaza una instalación.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writePrivateEnvironment } from './private-env.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['.env', 'backend/.env.development', 'frontend/.env.local', 'bridge/appsettings.Local.json', 'local-access.json'];
if (targets.some(p => existsSync(resolve(root, p)))) {
  console.error('Configuración local existente: no se sobrescribe. Consulte README para rotación o recuperación.');
  process.exit(1);
}
const key = () => randomBytes(32).toString('hex');
const secrets = { sa: `Sa!${key()}`, db: `App!${key()}`, jwt: key(), device: key(), signing: key(), encryption: key(), bridge: key(), admin: `Admin!${randomBytes(12).toString('hex')}` };
writePrivateEnvironment(resolve(root, '.env'), {
  SQL_SA_PASSWORD: secrets.sa, PORT: '3000', SQL_HOST: '127.0.0.1', SQL_PORT: '1433', SQL_DATABASE: 'SchoolAttendance', SQL_USERNAME: 'school_app', SQL_PASSWORD: secrets.db,
  JWT_SECRET: secrets.jwt, DEVICE_TOKEN: secrets.device, DEVICE_SIGNING_KEY: secrets.signing, BIOMETRIC_ENCRYPTION_KEY: secrets.encryption, DEVICE_ID: 'local-reader-01',
  ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173', SCHOOL_TIMEZONE: 'America/Guatemala', MIN_MARK_INTERVAL_SECONDS: '30', ALLOW_SIMULATION: 'false',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@escuela.local', BOOTSTRAP_ADMIN_PASSWORD: secrets.admin,
  VITE_API_URL: 'http://localhost:3000', VITE_WS_BRIDGE_URL: 'ws://127.0.0.1:8080', VITE_BRIDGE_TOKEN: secrets.bridge,
});
console.log('Configuración privada creada en .env. No comparta sus valores.');
