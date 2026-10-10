import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

abstract class RecordEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @CreateDateColumn({ type: 'datetime2' }) createdAt!: Date;
}
@Entity('admin_users')
export class AdminUser extends RecordEntity {
  @Column({ type: 'nvarchar', length: 254, unique: true }) email!: string;
  @Column({ type: 'nvarchar', length: 256, select: false }) passwordHash!: string;
  @Column({ type: 'bit', default: true }) active!: boolean;
  @Column({ type: 'int', default: 0 }) tokenVersion!: number;
}
@Entity('school_config')
export class SchoolConfig {
  @Column({ type: 'int', primary: true }) id!: number;
  @Column({ type: 'nvarchar', length: 120 }) name!: string;
  @Column({ type: 'nvarchar', length: 80 }) timeZone!: string;
}
@Entity('employees')
export class Employee extends RecordEntity {
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, select: false }) encryptedPhoto!: string | null;
  @Column({ type: 'bit', default: false }) hasPhoto!: boolean;
  @Column({ type: 'nvarchar', length: 5, nullable: true }) scheduledExit!: string | null;
  @Column({ type: 'nvarchar', length: 40, unique: true }) code!: string;
  @Column({ type: 'nvarchar', length: 120 }) fullName!: string;
  @Column({ type: 'nvarchar', length: 100, default: '' }) position!: string;
  @Column({ type: 'bit', default: true }) active!: boolean;
  @Column({ type: 'nvarchar', length: 200, nullable: true }) consentSignature!: string | null;
  @Column({ type: 'datetime2', nullable: true }) consentSignedAt!: Date | null;
  @Column({ type: 'nvarchar', length: 20, nullable: true }) consentVersion!: string | null;
}
@Entity('biometrics')
export class Biometric extends RecordEntity {
  @Column({ type: 'uniqueidentifier', unique: true }) employeeId!: string;
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'employeeId' }) employee!: Employee;
  @Column({ type: 'nvarchar', length: 'MAX', select: false }) encryptedFmd!: string;
  @Column({ type: 'nvarchar', length: 40 }) format!: string;
  @Column({ type: 'nvarchar', length: 16 }) mode!: 'hardware' | 'simulation';
}
@Entity('attendance')
@Index('IX_attendance_employee_date', ['employeeId', 'schoolDate', 'createdAt'])
export class Attendance extends RecordEntity {
  @Column({ type: 'nvarchar', length: 16, nullable: true }) trafficLight!: string | null;
  @Column({ type: 'nvarchar', length: 5, nullable: true }) scheduledExit!: string | null;
  @Column({ type: 'int', nullable: true }) deviationMinutes!: number | null;
  @Column({ type: 'bigint', generated: 'increment', unique: true }) sequence!: string;
  @Column({ type: 'uniqueidentifier' }) employeeId!: string;
  @ManyToOne(() => Employee) @JoinColumn({ name: 'employeeId' }) employee!: Employee;
  @Column({ type: 'uniqueidentifier', unique: true }) captureId!: string;
  @Column({ type: 'nvarchar', length: 64 }) deviceId!: string;
  @Column({ type: 'datetime2' }) capturedAt!: Date;
  @Column({ type: 'date' }) schoolDate!: string;
  @Column({ type: 'nvarchar', length: 3 }) direction!: 'IN' | 'OUT';
  @Column({ type: 'nvarchar', length: 16 }) mode!: 'hardware' | 'simulation';
}
@Entity('enrollment_tickets')
export class EnrollmentTicket extends RecordEntity {
  @Column({ type: 'uniqueidentifier' }) employeeId!: string;
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'employeeId' }) employee!: Employee;
  @Column({ type: 'nvarchar', length: 64, unique: true }) tokenHash!: string;
  @Column({ type: 'uniqueidentifier' }) adminId!: string;
  @ManyToOne(() => AdminUser) @JoinColumn({ name: 'adminId' }) admin!: AdminUser;
  @Column({ type: 'int' }) adminVersion!: number;
  @Column({ type: 'datetime2' }) expiresAt!: Date;
  @Column({ type: 'datetime2', nullable: true }) usedAt!: Date | null;
}
export const entities = [AdminUser, SchoolConfig, Employee, Biometric, Attendance, EnrollmentTicket];
