import 'reflect-metadata';
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import sql from 'mssql';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { dbOptions } from './options';
import { AdminUser, SchoolConfig } from './entities';
import { hashPassword } from '../security/password';
dotenv.config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const sa = process.env.SQL_SA_PASSWORD;
if (!sa) throw new Error('Falta SQL_SA_PASSWORD en .env raíz');
if (config.db.database !== 'SchoolAttendance' || config.db.username !== 'school_app') throw new Error('Inicializador limitado a SchoolAttendance/school_app');
const literal = (v: string) => "N'" + v.replaceAll("'", "''") + "'";
async function main() {
  const pool = await new sql.ConnectionPool({ server: config.db.host, port: config.db.port, user: 'sa', password: sa, database: 'master', options: { encrypt: true, trustServerCertificate: true } }).connect();
  try {
    await pool.request().query("IF DB_ID('SchoolAttendance') IS NULL CREATE DATABASE SchoolAttendance");
    // Identificadores fijos y contraseña escapada: no se concatena entrada del navegador.
    await pool.request().query(`IF NOT EXISTS(SELECT 1 FROM sys.server_principals WHERE name='school_app') CREATE LOGIN school_app WITH PASSWORD=${literal(config.db.password)}, CHECK_POLICY=ON;`);
  } finally { await pool.close(); }
  const source = new DataSource({ ...dbOptions(), username: 'sa', password: sa });
  try {
    await source.initialize(); await source.runMigrations();
    await source.query("IF NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name='school_app') CREATE USER school_app FOR LOGIN school_app; GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO school_app;");
    const admins = source.getRepository(AdminUser); const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
    if (email && !await admins.findOneBy({ email })) {
      const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (!password || password.length < 12) throw new Error('Se necesita contraseña inicial de 12 caracteres');
      await admins.save(admins.create({ email, passwordHash: await hashPassword(password), active: true, tokenVersion: 0 }));
    }
    const school = source.getRepository(SchoolConfig);
    if (!await school.findOneBy({ id: 1 })) await school.save({ id: 1, name: 'Centro Educativo', timeZone: config.timeZone });
    console.log('Base, migraciones, cuenta limitada y administrador inicial preparados.');
  } finally { if (source.isInitialized) await source.destroy(); }
}
main().catch(() => { console.error('Inicialización fallida. Revise Docker, credenciales y configuración; no se imprimen secretos.'); process.exitCode = 1; });
