import { it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: resolve('../.env'), quiet: true });
const require = createRequire(import.meta.url);
it('coordina cambio de zona y primera asistencia sin reinterpretar historial', async () => {
  const { DataSource } = require('typeorm'); const { dbOptions } = require('../../dist/database/options');
  const { Employee, Biometric, SchoolConfig } = require('../../dist/database/entities');
  const { AdminRepository } = require('../../dist/admin/admin.repository'); const { AttendanceRepository } = require('../../dist/attendance/attendance.repository');
  const { schoolDate } = require('../../dist/attendance/attendance-policy'); const { encryptTemplate } = require('../../dist/security/crypto');
  const name = `SchoolAttendanceRace_${randomUUID().replaceAll('-', '')}`;
  const credentials = { ...dbOptions(), username: 'sa', password: process.env.SQL_SA_PASSWORD };
  const master = new DataSource({ ...credentials, database: 'master' }); let db: any, gate: any;
  try {
    await master.initialize(); await master.query(`CREATE DATABASE [${name}]`);
    db = new DataSource({ ...credentials, database: name }); await db.initialize(); await db.runMigrations();
    await db.getRepository(SchoolConfig).save({ id: 1, name: 'Race', timeZone: 'America/Guatemala' });
    const employee = await db.getRepository(Employee).save({ code: 'RACE-1', fullName: 'Prueba concurrente', active: true, consentSignature: 'Prueba concurrente', consentSignedAt: new Date(), consentVersion: '1.0' });
    await db.getRepository(Biometric).save({ employeeId: employee.id, encryptedFmd: encryptTemplate('SIMULATED-FMD:race', process.env.BIOMETRIC_ENCRYPTION_KEY), format: 'SIMULATION-v1', mode: 'simulation' });
    // Un lock real de tabla detiene el count previo. La captura debe esperar la
    // misma configuración, no tomar una zona vieja antes de insertar.
    gate = db.createQueryRunner(); await gate.connect(); await gate.startTransaction('SERIALIZABLE'); await gate.query('SELECT COUNT(*) AS n FROM attendance WITH (TABLOCKX,HOLDLOCK)');
    const targetZone = schoolDate(new Date(), 'Pacific/Kiritimati') !== schoolDate(new Date(), 'America/Guatemala') ? 'Pacific/Kiritimati' : 'Etc/GMT+12';
    const update = new AdminRepository(db).updateSchool('Race', targetZone);
    await new Promise(r => setTimeout(r, 200));
    const mark = new AttendanceRepository(db).mark({ employeeId: employee.id, deviceId: 'local-reader-01', captureId: randomUUID(), capturedAt: new Date().toISOString(), mode: 'simulation', signature: '0'.repeat(64) });
    await new Promise(r => setTimeout(r, 200)); await gate.commitTransaction();
    const [, attendance] = await Promise.all([update, mark]); const config = await db.getRepository(SchoolConfig).findOneByOrFail({ id: 1 });
    expect(config.timeZone).toBe(targetZone); expect(attendance.schoolDate).toBe(schoolDate(attendance.createdAt, config.timeZone));
  } finally {
    if (gate?.isTransactionActive) await gate.rollbackTransaction(); if (gate) await gate.release();
    if (db?.isInitialized) await db.destroy();
    if (master.isInitialized) { await master.query(`IF DB_ID('${name}') IS NOT NULL DROP DATABASE [${name}]`); await master.destroy(); }
  }
});
