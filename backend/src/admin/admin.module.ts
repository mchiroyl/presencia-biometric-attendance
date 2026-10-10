import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BiometricModule } from '../biometrics/biometric.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { AdminRepositoryPort } from '../domain/repository-ports';
@Module({ imports: [AuthModule, BiometricModule], controllers: [AdminController], providers: [AdminService, AdminRepository, { provide: AdminRepositoryPort, useExisting: AdminRepository }] })
export class AdminModule {}
