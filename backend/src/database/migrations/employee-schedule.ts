import { MigrationInterface, QueryRunner } from 'typeorm';
export class EmployeeSchedule1780000000003 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query("ALTER TABLE employees ADD scheduledExit nvarchar(5) NULL CONSTRAINT CK_employee_exit CHECK (scheduledExit IN ('12:45','13:00'))");
    await q.query('ALTER TABLE attendance ADD trafficLight nvarchar(16) NULL, scheduledExit nvarchar(5) NULL, deviationMinutes int NULL');
  }
  async down(q: QueryRunner) {
    await q.query('ALTER TABLE attendance DROP COLUMN trafficLight, scheduledExit, deviationMinutes');
    await q.query('ALTER TABLE employees DROP CONSTRAINT CK_employee_exit');
    await q.query('ALTER TABLE employees DROP COLUMN scheduledExit');
  }
}
