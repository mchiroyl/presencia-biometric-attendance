import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const local = dotenv.parse(readFileSync(resolve(__dirname, '../../.env')));
// Runtime usa solo su configuración: no importa credenciales sa ni bootstrap al entorno.
for (const name of ['NODE_ENV', 'PORT', 'SQL_HOST', 'SQL_PORT', 'SQL_DATABASE', 'SQL_USERNAME', 'SQL_PASSWORD', 'JWT_SECRET', 'DEVICE_TOKEN', 'DEVICE_SIGNING_KEY', 'BIOMETRIC_ENCRYPTION_KEY', 'DEVICE_ID', 'ALLOWED_ORIGINS', 'SCHOOL_TIMEZONE', 'MIN_MARK_INTERVAL_SECONDS', 'ALLOW_SIMULATION']) {
  if (process.env[name] === undefined && local[name] !== undefined) process.env[name] = local[name];
}
function required(name: string): string { const value = process.env[name]; if (!value || value.startsWith('GENERAR')) throw new Error(`Falta configurar ${name}`); return value; }
function hex(name: string) { const v = required(name); if (!/^[a-f0-9]{64}$/i.test(v)) throw new Error(`${name} debe ser 32 bytes hex`); return v; }
function integer(name: string, fallback: number, min: number, max: number) { const v = Number(process.env[name] ?? fallback); if (!Number.isInteger(v) || v < min || v > max) throw new Error(`Valor inválido: ${name}`); return v; }
export const config = {
  port: integer('PORT', 3000, 1, 65535),
  db: { host: required('SQL_HOST'), port: integer('SQL_PORT', 1433, 1, 65535), database: required('SQL_DATABASE'), username: required('SQL_USERNAME'), password: required('SQL_PASSWORD') },
  jwtSecret: hex('JWT_SECRET'), deviceToken: hex('DEVICE_TOKEN'), signingKey: hex('DEVICE_SIGNING_KEY'), encryptionKey: hex('BIOMETRIC_ENCRYPTION_KEY'), deviceId: required('DEVICE_ID'),
  allowedOrigins: required('ALLOWED_ORIGINS').split(','), timeZone: process.env.SCHOOL_TIMEZONE ?? 'America/Guatemala',
  minimumInterval: integer('MIN_MARK_INTERVAL_SECONDS', 30, 0, 3600), allowSimulation: process.env.ALLOW_SIMULATION === 'true',
};
if (!['127.0.0.1', 'localhost'].includes(config.db.host) && !(process.env.CONTAINERIZED === 'true' && config.db.host === 'sqlserver')) throw new Error('SQL debe estar en loopback o en el servicio privado sqlserver de Docker');
if (config.allowedOrigins.some(o => !/^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(o))) throw new Error('Origen local inválido');
new Intl.DateTimeFormat('es-GT', { timeZone: config.timeZone });
