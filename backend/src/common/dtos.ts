import { IsString, IsEmail, Length, Matches, IsOptional, IsBoolean, IsUUID, IsISO8601, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
export class LoginDto {
  @IsEmail() @Length(3, 254) email!: string;
  @IsString() @Length(1, 128) password!: string;
}
export class EmployeeCreateDto {
  @IsString() @Length(30, 2800000) photoDataUrl!: string;
  @IsOptional() @IsIn(['12:45', '13:00']) scheduledExit?: string | null;
  @IsString() @Length(2, 120) @Matches(/\S/) fullName!: string;
  @IsOptional() @IsString() @Length(0, 100) position?: string;
  @IsOptional() @IsString() @Length(2, 200) @Matches(/\S/) consentSignature?: string | null;
}
export class EmployeeUpdateDto {
  @IsOptional() @IsString() @Length(30, 2800000) photoDataUrl?: string;
  @IsOptional() @IsIn(['12:45', '13:00']) scheduledExit?: string | null;
  @IsOptional() @IsString() @Length(2, 120) @Matches(/\S/) fullName?: string;
  @IsOptional() @IsString() @Length(0, 100) position?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @Length(2, 200) @Matches(/\S/) consentSignature?: string | null;
}
export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 25;
  @IsOptional() @IsString() @Length(0, 120) search?: string;
}
export class AttendanceQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
}
export class MarkDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,64}$/) deviceId!: string;
  @IsUUID() employeeId!: string;
  @IsUUID() captureId!: string;
  @IsISO8601({ strict: true }) @Length(20, 32) capturedAt!: string;
  @IsIn(['hardware', 'simulation']) mode!: 'hardware' | 'simulation';
  @Matches(/^[a-f0-9]{64}$/) signature!: string;
}
export class EnrollmentDto {
  @IsString() @Length(20, 2048) ticket!: string;
  @IsString() @Length(10, 65536) fmd!: string;
  @IsIn(['hardware', 'simulation']) mode!: 'hardware' | 'simulation';
}
export class EnrollmentAuthorizationDto {
  @IsString() @Length(20, 2048) ticket!: string;
}
export class SchoolDto {
  @IsString() @Length(2, 120) @Matches(/\S/) name!: string;
  @IsString() @Length(3, 80) timeZone!: string;
}
export class AdminCreateDto {
  @IsEmail() @Length(3, 254) email!: string;
  @IsString() @Length(12, 128) @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/) password!: string;
}
export class PasswordDto {
  @IsString() @Length(1, 128) currentPassword!: string;
  @IsString() @Length(12, 128) @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/) newPassword!: string;
}
