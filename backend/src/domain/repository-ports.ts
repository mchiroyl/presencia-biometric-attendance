// Contratos internos sin NestJS, TypeORM o validadores HTTP. Los servicios dependen
// de estos puertos; los módulos enlazan adaptadores concretos de persistencia.
export type CaptureMode = 'hardware' | 'simulation';
export interface PaginationInput { page: number; limit: number; search?: string; }
export interface Page<T> { items: T[]; total: number; page: number; limit: number; }
export interface EmployeeInput { photoDataUrl?: string; fullName: string; position?: string; consentSignature?: string | null; }
export interface EmployeePatch { photoDataUrl?: string; fullName?: string; position?: string; active?: boolean; consentSignature?: string | null; }
export interface EmployeeRecord { id: string; createdAt: Date; code: string; fullName: string; position: string; active: boolean; consentSignature: string | null; consentSignedAt: Date | null; consentVersion: string | null; }
export interface EmployeeView extends EmployeeRecord { hasBiometric: boolean; biometricMode: CaptureMode | null; }
export interface AdminRecord { id: string; createdAt: Date; email: string; active: boolean; tokenVersion: number; }
export interface PrivateAdminRecord extends AdminRecord { passwordHash: string; }
export interface SchoolRecord { id: number; name: string; timeZone: string; }
export interface CaptureEvidence { deviceId: string; employeeId: string; captureId: string; capturedAt: string; mode: CaptureMode; signature: string; }
export interface AttendanceRecord { id: string; sequence: string; createdAt: Date; employeeId: string; captureId: string; deviceId: string; capturedAt: Date; schoolDate: string; direction: 'IN' | 'OUT'; mode: CaptureMode; }
export interface AttendanceView extends AttendanceRecord { employee: { id: string; code: string; fullName: string }; }
export interface AttendanceMark extends AttendanceRecord { employeeName: string; duplicate: boolean; }
export abstract class AuthRepositoryPort {
  abstract findByEmail(email: string): Promise<PrivateAdminRecord | null>;
  abstract findById(id: string): Promise<AdminRecord | null>;
  abstract findPrivateById(id: string): Promise<PrivateAdminRecord | null>;
  abstract changePassword(id: string, hash: string): Promise<void>;
}
export abstract class AdminRepositoryPort {
  abstract photo(id: string): Promise<{ photoDataUrl: string | null }>;
  abstract employees(query: PaginationInput): Promise<Page<EmployeeView>>;
  abstract createEmployee(dto: EmployeeInput): Promise<EmployeeRecord & { hasBiometric: boolean }>;
  abstract updateEmployee(id: string, dto: EmployeePatch): Promise<EmployeeRecord>;
  abstract attendance(query: PaginationInput & { date?: string; employeeId?: string }): Promise<Page<AttendanceView>>;
  abstract school(): Promise<SchoolRecord>;
  abstract updateSchool(name: string, timeZone: string): Promise<SchoolRecord>;
  abstract admins(): Promise<AdminRecord[]>;
  abstract createAdmin(email: string, passwordHash: string): Promise<AdminRecord>;
  abstract deactivateAdmin(id: string): Promise<{ message: string }>;
  abstract summary(date: string): Promise<{ employees: number; enrolled: number; marks: number; presentToday: number; date: string }>;
}
export abstract class BiometricRepositoryPort {
  abstract authorizeEnrollment(employeeId: string, token: string): Promise<{ employeeId: string }>;
  abstract issueTicket(employeeId: string, token: string, adminId: string, adminVersion: number): Promise<void>;
  abstract enroll(employeeId: string, token: string, fmd: string, mode: CaptureMode): Promise<{ employeeId: string; message: string; mode: CaptureMode }>;
  abstract templates(): Promise<{ employeeId: string; fmd: string; mode: CaptureMode }[]>;
}
export abstract class AttendanceRepositoryPort { abstract mark(dto: CaptureEvidence): Promise<AttendanceMark>; }
