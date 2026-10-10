import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BiometricService } from './biometric.service';
import { BiometricRepository } from './biometric.repository';
import { DeviceGuard } from './device.guard';
import { DeviceController } from './device.controller';
import { BiometricRepositoryPort } from '../domain/repository-ports';
@Module({ imports: [AuthModule], controllers: [DeviceController], providers: [BiometricService, BiometricRepository, { provide: BiometricRepositoryPort, useExisting: BiometricRepository }, DeviceGuard], exports: [BiometricService] })
export class BiometricModule {}
