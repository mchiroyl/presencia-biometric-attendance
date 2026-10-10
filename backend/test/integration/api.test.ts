import sharp from 'sharp';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac, randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config({ path: resolve('../.env'), quiet: true });
const require = createRequire(import.meta.url);
let testPhoto: string;
let app: any, server: any, token: string, employee: any;
const marker = randomUUID().slice(0, 8);
const credentials = { email: process.env.BOOTSTRAP_ADMIN_EMAIL!, password: process.env.BOOTSTRAP_ADMIN_PASSWORD! };
function signed(id: string, captureId = randomUUID(), capturedAt = new Date().toISOString(), mode = 'simulation') {
  const deviceId = process.env.DEVICE_ID!;
  const signature = createHmac('sha256', Buffer.from(process.env.DEVICE_SIGNING_KEY!, 'hex')).update([deviceId, id, captureId, capturedAt, mode].join('\n')).digest('hex');
  return { deviceId, employeeId: id, captureId, capturedAt, mode, signature };
}
const auth = () => ({ Authorization: `Bearer ${token}` });
describe('API real + SQL Server', () => {
  beforeAll(async () => {
    testPhoto = 'data:image/png;base64,' + (await sharp({ create: { width: 64, height: 80, channels: 3, background: '#aaaaaa' } }).png().toBuffer()).toString('base64');
    process.env.ALLOW_SIMULATION = 'true';
    process.env.MIN_MARK_INTERVAL_SECONDS = '0';
    process.env.PORT = '3001';
    const { createApp } = require('../../dist/app');
    app = await createApp(); await app.init(); server = app.getHttpServer();
    const login = await request(server).post('/auth/login').send({ email: credentials.email, password: credentials.password });
    expect(login.status).toBe(201); token = login.body.accessToken;
  });
  afterAll(async () => { if (employee) await request(server).delete(`/admin/employees/${employee.id}`).set(auth()); await app?.close(); });
  it('protege administración sin JWT', async () => expect((await request(server).get('/admin/employees')).status).toBe(401));
  it('rechaza contraseña incorrecta', async () => expect((await request(server).post('/auth/login').send({ email: credentials.email, password: 'incorrect-password' })).status).toBe(401));
  it('rechaza campos no permitidos', async () => expect((await request(server).post('/admin/employees').set(auth()).send({ code: marker, fullName: 'Prueba', unknown: true })).status).toBe(400));
  it('crea empleado con consentimiento firmado', async () => {
    const res = await request(server).post('/admin/employees').set(auth()).send({ photoDataUrl: testPhoto, fullName: `Empleado de prueba ${marker}`, position: 'Docente', scheduledExit: '12:45', consentSignature: 'Empleado de prueba' });
    expect(res.status).toBe(201); employee = res.body; expect(employee.consentSignedAt).toBeTruthy(); expect(employee.hasBiometric).toBe(false);
    expect(employee.code).toMatch(/^EMP-\d{6,}$/);
  });
  it('exige foto y protege su consulta', async () => {
    expect((await request(server).post('/admin/employees').set(auth()).send({ fullName: 'Sin foto' })).status).toBe(400);
    expect((await request(server).get(`/admin/employees/${employee.id}/photo`)).status).toBe(401);
    const res = await request(server).get(`/admin/employees/${employee.id}/photo`).set(auth()); expect(res.status).toBe(200); expect(res.body.photoDataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(employee).not.toHaveProperty('encryptedPhoto');
  });
  it('rechaza código suministrado por el cliente al crear', async () => expect((await request(server).post('/admin/employees').set(auth()).send({ code: 'CUSTOM-1', fullName: 'Otro empleado' })).status).toBe(400));
  it('conserva el código generado al editar y rechaza modificarlo por API', async () => {
    expect((await request(server).patch(`/admin/employees/${employee.id}`).set(auth()).send({ code: 'CHANGED' })).status).toBe(400);
    const updated = await request(server).patch(`/admin/employees/${employee.id}`).set(auth()).send({ position: 'Dirección' });
    expect(updated.status).toBe(200); expect(updated.body.code).toBe(employee.code); expect(updated.body.position).toBe('Dirección');
  });
  it('asigna códigos únicos en ocho altas concurrentes', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, (_, index) => request(server).post('/admin/employees').set(auth()).send({ photoDataUrl: testPhoto, fullName: `Concurrente ${marker} ${index}` })));
    try { expect(responses.every(x => x.status === 201)).toBe(true); expect(new Set(responses.map(x => x.body.code)).size).toBe(8); }
    finally { for (const res of responses) if (res.status === 201) await request(server).delete(`/admin/employees/${res.body.id}`).set(auth()); }
  });
  it('SQL impide modificar el código incluso fuera de la API', async () => {
    const db = app.get(require('typeorm').DataSource);
    await expect(db.query('UPDATE employees SET code=@0 WHERE id=@1', ['CHANGED-SQL', employee.id])).rejects.toThrow();
    const rows = await db.query('SELECT code FROM employees WHERE id=@0', [employee.id]); expect(rows[0].code).toBe(employee.code);
  });
  it('no entrega plantillas a un navegador con JWT', async () => expect((await request(server).get('/device/templates').set(auth())).status).toBe(401));
  it('enrola plantilla mediante ticket de un solo uso', async () => {
    const ticketRes = await request(server).post(`/admin/employees/${employee.id}/enrollment-ticket`).set(auth()); expect(ticketRes.status).toBe(201);
    const payload = { ticket: ticketRes.body.ticket, fmd: 'SIMULATED-FMD:integration-' + marker, mode: 'simulation' };
    const authorized = await request(server).post('/device/enrollments/authorize').set('X-Device-Token', process.env.DEVICE_TOKEN!).send({ ticket: payload.ticket });
    expect(authorized.status).toBe(201); expect(authorized.body.employeeId).toBe(employee.id);
    expect((await request(server).post('/device/enrollments/authorize').set(auth()).send({ ticket: payload.ticket })).status).toBe(401);
    expect((await request(server).post('/device/enrollments/authorize').set('X-Device-Token', process.env.DEVICE_TOKEN!).send({ ticket: 'x'.repeat(30) })).status).toBe(401);
    const res = await request(server).post('/device/enrollments').set('X-Device-Token', process.env.DEVICE_TOKEN!).send(payload);
    expect(res.status).toBe(201);
    expect((await request(server).post('/device/enrollments/authorize').set('X-Device-Token', process.env.DEVICE_TOKEN!).send({ ticket: payload.ticket })).status).toBe(409);
    expect((await request(server).post('/device/enrollments').set('X-Device-Token', process.env.DEVICE_TOKEN!).send(payload)).status).toBe(409);
    const list = await request(server).get('/admin/employees').set(auth());
    expect(list.body.items.find((x: any) => x.id === employee.id).hasBiometric).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain('SIMULATED-FMD');
  });
  it('persiste FMD cifrado y utiliza cuenta SQL sin CREATE TABLE', async () => {
    const db = app.get(require('typeorm').DataSource);
    const rows = await db.query('SELECT encryptedFmd FROM biometrics WHERE employeeId=@0', [employee.id]);
    expect(rows[0].encryptedFmd).not.toContain('SIMULATED-FMD'); expect(rows[0].encryptedFmd.split('.')).toHaveLength(3);
    const permissions = await db.query("SELECT HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS ddl, HAS_PERMS_BY_NAME('dbo.employees','OBJECT','INSERT') AS dml");
    expect(permissions[0]).toEqual({ ddl: 0, dml: 1 });
  });
  it('rechaza simulación cuando el servidor la deshabilita', async () => {
    const { config } = require('../../dist/config'); config.allowSimulation = false;
    try { expect((await request(server).post('/attendance/mark').send(signed(employee.id))).status).toBe(403); }
    finally { config.allowSimulation = true; }
  });
  it('rechaza firma falsificada', async () => expect((await request(server).post('/attendance/mark').send({ ...signed(employee.id), signature: '0'.repeat(64) })).status).toBe(401));
  it('rechaza evidencia antigua', async () => expect((await request(server).post('/attendance/mark').send(signed(employee.id, randomUUID(), new Date(Date.now() - 120000).toISOString()))).status).toBe(401));
  it('marca IN, hace reintento idempotente y después OUT', async () => {
    const payload = signed(employee.id); const a = await request(server).post('/attendance/mark').send(payload); expect(a.status).toBe(201); expect(a.body.direction).toBe('IN');
    expect(a.body.scheduledExit).toBe('12:45'); expect(['green','yellow','red']).toContain(a.body.trafficLight);
    const changed = await request(server).patch(`/admin/employees/${employee.id}`).set(auth()).send({ scheduledExit: '13:00' }); expect(changed.status).toBe(200);
    const invalid = await request(server).patch(`/admin/employees/${employee.id}`).set(auth()).send({ scheduledExit: '14:00' }); expect(invalid.status).toBe(400);
    const again = await request(server).post('/attendance/mark').send(payload); expect(again.body.id).toBe(a.body.id); expect(again.body.scheduledExit).toBe('12:45');
    const b = await request(server).post('/attendance/mark').send(signed(employee.id)); expect(b.status).toBe(201); expect(b.body.direction).toBe('OUT'); expect(b.body.scheduledExit).toBe('13:00');
  });
  it('serializa dos capturas concurrentes', async () => {
    const res = await Promise.all([request(server).post('/attendance/mark').send(signed(employee.id)), request(server).post('/attendance/mark').send(signed(employee.id))]);
    expect(res.map(x => x.status)).toEqual([201, 201]); expect(res.map(x => x.body.direction).sort()).toEqual(['IN', 'OUT']);
  });
  it('respeta intervalo mínimo entre capturas', async () => {
    const { config } = require('../../dist/config'); config.minimumInterval = 30;
    try { expect((await request(server).post('/attendance/mark').send(signed(employee.id))).status).toBe(409); }
    finally { config.minimumInterval = 0; }
  });
  it('lista únicamente los cuatro marcajes confirmados', async () => {
    const res = await request(server).get('/admin/attendance').set(auth()).query({ employeeId: employee.id }); expect(res.status).toBe(200); expect(res.body.items.length).toBe(4);
  });
  it('cambiar contraseña revoca JWT anterior y desactivar revoca la nueva sesión', async () => {
    const password = 'IntegrationTest123!'; const newPassword = 'IntegrationNew456!'; const email = `test-${marker}@escuela.local`;
    const created = await request(server).post('/admin/users').set(auth()).send({ email, password }); expect(created.status).toBe(201); expect(created.body.passwordHash).toBeUndefined();
    const login = await request(server).post('/auth/login').send({ email, password }); expect(login.status).toBe(201);
    const secondary = { Authorization: `Bearer ${login.body.accessToken}` };
    expect((await request(server).post('/auth/password').set(secondary).send({ currentPassword: password, newPassword })).status).toBe(201);
    expect((await request(server).get('/auth/me').set(secondary)).status).toBe(401);
    const relogin = await request(server).post('/auth/login').send({ email, password: newPassword }); expect(relogin.status).toBe(201);
    expect((await request(server).delete(`/admin/users/${created.body.id}`).set(auth())).status).toBe(200);
    expect((await request(server).get('/auth/me').set('Authorization', `Bearer ${relogin.body.accessToken}`)).status).toBe(401);
  });
  it('revoca consentimiento y elimina plantilla', async () => {
    expect((await request(server).patch(`/admin/employees/${employee.id}`).set(auth()).send({ consentSignature: null })).status).toBe(200);
    expect((await request(server).post('/attendance/mark').send(signed(employee.id))).status).toBe(403);
    expect((await request(server).post(`/admin/employees/${employee.id}/enrollment-ticket`).set(auth())).status).toBe(403);
  });
  it('usa CORS exacto', async () => {
    const res = await request(server).get('/health').set('Origin', 'https://evil.example'); expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
