// Verificación de solo lectura: no registra empleados ni captura biometría.
const { readFileSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const env = require('dotenv').parse(readFileSync('.env'));
const files = ['-f','docker-compose.yml','-f','docker-compose.linux.yml','-f','docker-compose.desktop.yml'];
(async () => {
  const health = await (await fetch('http://127.0.0.1:3000/health')).json();
  assert.equal(health.database, 'connected'); assert.equal(health.simulation, false);
  const login = await fetch('http://127.0.0.1:3000/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.BOOTSTRAP_ADMIN_EMAIL, password: env.BOOTSTRAP_ADMIN_PASSWORD }) });
  assert.equal(login.status, 201);
  const { accessToken } = await login.json();
  const response = await fetch('http://127.0.0.1:3000/admin/employees', { headers: { Authorization: `Bearer ${accessToken}` } });
  assert.equal(response.status, 200);
  const employees = await response.json();
  const html = await (await fetch('http://127.0.0.1:5173')).text();
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  const bundle = await (await fetch('http://127.0.0.1:5173' + asset)).text();
  const privateKeys = ['SQL_SA_PASSWORD', 'SQL_PASSWORD', 'JWT_SECRET', 'DEVICE_TOKEN', 'DEVICE_SIGNING_KEY', 'BIOMETRIC_ENCRYPTION_KEY', 'BOOTSTRAP_ADMIN_PASSWORD'];
  for (const key of privateKeys) assert.ok(!bundle.includes(env[key]), 'Un secreto privado apareció en el cliente');
  assert.ok(bundle.includes(env.VITE_BRIDGE_TOKEN));
  const apiEnv = execFileSync('docker', ['compose', ...files, 'exec', '-T', 'api', 'node', '-e', 'process.stdout.write(JSON.stringify(Object.keys(process.env)))'], { encoding: 'utf8' });
  for (const key of ['SQL_SA_PASSWORD','BOOTSTRAP_ADMIN_PASSWORD']) assert.ok(!JSON.parse(apiEnv).includes(key));
  const report = { executedAt: new Date().toISOString(), health, administratorLoginWorks: true, employeesPreserved: employees.total, privateSecretsAbsentFromBrowser: true, checkedPrivateKeys: privateKeys.length, apiDoesNotReceivePrivilegedCredentials: true };
  writeFileSync('docs/evidence/docker-check.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(() => { console.error('Falló la verificación Docker; diagnóstico sin credenciales.'); process.exitCode = 1; });
