import { classifyAttendance } from './schedule-policy';
import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Attendance, Biometric, Employee, SchoolConfig } from '../database/entities';
import { MarkDto } from '../common/dtos';
import { schoolDate, nextDirection } from './attendance-policy';
import { config } from '../config';
import { AttendanceRepositoryPort } from '../domain/repository-ports';
@Injectable()
export class AttendanceRepository implements AttendanceRepositoryPort {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  mark(dto: MarkDto) {
    return this.db.transaction('SERIALIZABLE', async manager => {
      // UPDLOCK sobre el empleado serializa incluso cuando todavía no hay marcajes hoy.
      const employee = await manager.findOne(Employee, { where: { id: dto.employeeId }, lock: { mode: 'pessimistic_write' } });
      if (!employee?.active || !employee.consentSignedAt) throw new ForbiddenException('Empleado inactivo o consentimiento revocado');
      const biometric = await manager.findOneBy(Biometric, { employeeId: dto.employeeId });
      if (!biometric || biometric.mode !== dto.mode) throw new ForbiddenException('No existe huella registrada para este modo');
      const existing = await manager.findOneBy(Attendance, { captureId: dto.captureId });
      if (existing) {
        if (existing.employeeId !== dto.employeeId || existing.deviceId !== dto.deviceId) throw new ConflictException('Identificador de captura reutilizado');
        return { ...existing, employeeName: employee.fullName, duplicate: true };
      }
      const now = new Date(); const school = await manager.findOneOrFail(SchoolConfig, { where: { id: 1 }, lock: { mode: 'pessimistic_read' } });
      // El servidor decide el día; un reloj de puente manipulado no cambia el calendario escolar.
      const date = schoolDate(now, school.timeZone);
      const last = await manager.getRepository(Attendance).findOne({ where: { employeeId: dto.employeeId, schoolDate: date }, order: { sequence: 'DESC' } });
      if (last && now.getTime() - last.createdAt.getTime() < config.minimumInterval * 1000) throw new ConflictException('Espere antes de volver a marcar');
      const direction = nextDirection(last?.direction ?? null);
      const classification = classifyAttendance(now, school.timeZone, direction, employee.scheduledExit);
      const saved = await manager.save(Attendance, { ...classification, scheduledExit: employee.scheduledExit, employeeId: dto.employeeId, captureId: dto.captureId, deviceId: dto.deviceId, capturedAt: new Date(dto.capturedAt), schoolDate: date, direction, mode: dto.mode });
      return { ...saved, employeeName: employee.fullName, duplicate: false };
    });
  }
}
