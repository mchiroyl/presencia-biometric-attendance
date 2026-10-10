import { MigrationInterface, QueryRunner } from 'typeorm';
export class Initial1780000000000 implements MigrationInterface {
  name = 'Initial1780000000000';
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE admin_users (id uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY, createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), email nvarchar(254) NOT NULL UNIQUE, passwordHash nvarchar(256) NOT NULL, active bit NOT NULL DEFAULT 1, tokenVersion int NOT NULL DEFAULT 0);
      CREATE TABLE school_config (id int NOT NULL PRIMARY KEY CHECK(id=1), name nvarchar(120) NOT NULL, timeZone nvarchar(80) NOT NULL);
      CREATE TABLE employees (id uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY, createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), code nvarchar(40) NOT NULL UNIQUE, fullName nvarchar(120) NOT NULL, position nvarchar(100) NOT NULL DEFAULT '', active bit NOT NULL DEFAULT 1, consentSignature nvarchar(200) NULL, consentSignedAt datetime2 NULL, consentVersion nvarchar(20) NULL);
      CREATE TABLE biometrics (id uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY, createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), employeeId uniqueidentifier NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE, encryptedFmd nvarchar(max) NOT NULL, format nvarchar(40) NOT NULL, mode nvarchar(16) NOT NULL CHECK(mode IN ('hardware','simulation')));
      CREATE TABLE attendance (id uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY, createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), employeeId uniqueidentifier NOT NULL REFERENCES employees(id), captureId uniqueidentifier NOT NULL UNIQUE, deviceId nvarchar(64) NOT NULL, capturedAt datetime2 NOT NULL, schoolDate date NOT NULL, direction nvarchar(3) NOT NULL CHECK(direction IN ('IN','OUT')), mode nvarchar(16) NOT NULL CHECK(mode IN ('hardware','simulation')));
      CREATE INDEX IX_attendance_employee_date ON attendance(employeeId, schoolDate, createdAt DESC);
      CREATE TABLE enrollment_tickets (id uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY, createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), employeeId uniqueidentifier NOT NULL REFERENCES employees(id) ON DELETE CASCADE, tokenHash nvarchar(64) NOT NULL UNIQUE, adminId uniqueidentifier NOT NULL REFERENCES admin_users(id), adminVersion int NOT NULL, expiresAt datetime2 NOT NULL, usedAt datetime2 NULL);`);
  }
  async down(q: QueryRunner) { await q.query('DROP TABLE enrollment_tickets; DROP TABLE attendance; DROP TABLE biometrics; DROP TABLE employees; DROP TABLE school_config; DROP TABLE admin_users;'); }
}
