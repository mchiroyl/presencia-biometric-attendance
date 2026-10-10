import { EmployeePhoto1780000000004 } from './migrations/employee-photo';
import { EmployeeSchedule1780000000003 } from './migrations/employee-schedule';
import { config } from '../config';
import { entities } from './entities';
import { Initial1780000000000 } from './migrations/initial';
import { AttendanceSequence1780000000001 } from './migrations/attendance-sequence';
import { EmployeeCode1780000000002 } from './migrations/employee-code';
import { SqlServerConnectionOptions } from 'typeorm/driver/sqlserver/SqlServerConnectionOptions';
export function dbOptions(): SqlServerConnectionOptions {
  return { type: 'mssql', ...config.db, entities, migrations: [Initial1780000000000, AttendanceSequence1780000000001, EmployeeCode1780000000002, EmployeeSchedule1780000000003, EmployeePhoto1780000000004], synchronize: false, logging: false, options: { encrypt: true, trustServerCertificate: true, useUTC: true }, pool: { max: 10, min: 0 }, connectionTimeout: 15000, requestTimeout: 15000 };
}
