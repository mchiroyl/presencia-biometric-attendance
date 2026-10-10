import { MigrationInterface, QueryRunner } from 'typeorm';
export class EmployeePhoto1780000000004 implements MigrationInterface {
  async up(q: QueryRunner) { await q.query('ALTER TABLE employees ADD encryptedPhoto nvarchar(MAX) NULL, hasPhoto bit NOT NULL CONSTRAINT DF_employee_photo DEFAULT 0'); }
  async down(q: QueryRunner) {
    await q.query('ALTER TABLE employees DROP CONSTRAINT DF_employee_photo');
    await q.query('ALTER TABLE employees DROP COLUMN encryptedPhoto, hasPhoto');
  }
}
