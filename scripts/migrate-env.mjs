// Migración local sin imprimir, rotar ni duplicar las claves existentes.
import { readFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { writePrivateEnvironment } from './private-env.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const previous = ['backend/.env.development', 'frontend/.env.local', 'bridge/appsettings.Local.json', 'local-access.json'];
if (!previous.every(file => existsSync(resolve(root, file)))) throw new Error('La configuración anterior está incompleta. No se modifica.');
const values = { ...dotenv.parse(read('.env')), ...dotenv.parse(read(previous[0])), ...dotenv.parse(read(previous[1])) };
// NODE_ENV corresponde al proceso dev/build; no debe forzar builds Vite de desarrollo.
delete values.NODE_ENV;
const bridge = JSON.parse(read(previous[2])); const access = JSON.parse(read(previous[3]));
if (bridge.SecretToken !== values.VITE_BRIDGE_TOKEN || bridge.DeviceToken !== values.DEVICE_TOKEN || bridge.SigningKey !== values.DEVICE_SIGNING_KEY || access.email !== values.BOOTSTRAP_ADMIN_EMAIL || access.password !== values.BOOTSTRAP_ADMIN_PASSWORD) throw new Error('Configuración inconsistente. No se modifica.');
writePrivateEnvironment(resolve(root, '.env'), values);
const confirmed = dotenv.parse(read('.env'));
for (const [key, value] of Object.entries(values)) if (confirmed[key] !== value) throw new Error('La verificación final falló; se conservan las fuentes anteriores');
// El archivo nuevo ya está escrito y protegido antes de retirar copias conocidas.
for (const file of previous) unlinkSync(resolve(root, file));
function removeGeneratedCopies(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) removeGeneratedCopies(path);
    else if (entry.name === 'appsettings.Local.json') unlinkSync(path);
  }
}
removeGeneratedCopies(resolve(root, 'bridge'));
console.log('Configuración centralizada y protegida en .env. Claves conservadas; copias anteriores retiradas.');
