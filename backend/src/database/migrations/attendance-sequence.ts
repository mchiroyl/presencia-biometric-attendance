import { MigrationInterface, QueryRunner } from 'typeorm';
export class AttendanceSequence1780000000001 implements MigrationInterface {
  name = 'AttendanceSequence1780000000001';
  async up(q: QueryRunner) { await q.query('ALTER TABLE attendance ADD sequence bigint IDENTITY(1,1) NOT NULL; CREATE UNIQUE INDEX UX_attendance_sequence ON attendance(sequence);'); }
  async down(q: QueryRunner) { await q.query('DROP INDEX UX_attendance_sequence ON attendance; ALTER TABLE attendance DROP COLUMN sequence;'); }
}
