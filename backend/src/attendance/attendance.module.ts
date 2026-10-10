import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceController } from './attendance.controller';
import { AttendanceRepositoryPort } from '../domain/repository-ports';
@Module({ controllers: [AttendanceController], providers: [AttendanceService, AttendanceRepository, { provide: AttendanceRepositoryPort, useExisting: AttendanceRepository }] })
export class AttendanceModule {}
