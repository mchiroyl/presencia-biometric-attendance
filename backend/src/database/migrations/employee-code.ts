import { MigrationInterface, QueryRunner } from 'typeorm';
export class EmployeeCode1780000000002 implements MigrationInterface {
  name = 'EmployeeCode1780000000002';
  async up(q: QueryRunner) {
    // Preserva códigos históricos. Solo al migrar calcula el inicio de la secuencia,
    // evitando colisionar con códigos EMP existentes; todas las altas usan NEXT VALUE FOR.
    await q.query(`DECLARE @start bigint = (SELECT COALESCE(MAX(TRY_CONVERT(bigint, SUBSTRING(code, 5, 36))), 0) + 1 FROM dbo.employees WHERE code LIKE 'EMP-%');
      IF @start < 1 SET @start = 1;
      DECLARE @ddl nvarchar(250) = N'CREATE SEQUENCE dbo.employee_code_sequence AS bigint START WITH ' + CONVERT(nvarchar(20), @start) + N' INCREMENT BY 1 NO CYCLE';
      EXEC sys.sp_executesql @ddl;`);
    await q.query(`CREATE TRIGGER dbo.TR_employees_code_immutable ON dbo.employees AFTER UPDATE AS
      BEGIN
        SET NOCOUNT ON;
        IF UPDATE(code) AND EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON i.id=d.id WHERE CONVERT(varbinary(max),i.code) <> CONVERT(varbinary(max),d.code))
          THROW 51001, 'El codigo de empleado no se puede modificar', 1;
      END`);
  }
  async down(q: QueryRunner) {
    await q.query('DROP TRIGGER dbo.TR_employees_code_immutable; DROP SEQUENCE dbo.employee_code_sequence;');
  }
}
