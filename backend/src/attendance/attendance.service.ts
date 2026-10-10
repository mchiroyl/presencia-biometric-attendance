import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AttendanceRepositoryPort } from '../domain/repository-ports';
import { MarkDto } from '../common/dtos';
import { verifyAssertion } from '../security/crypto';
import { config } from '../config';
@Injectable()
export class AttendanceService {
  constructor(@Inject(AttendanceRepositoryPort) private readonly repo: AttendanceRepositoryPort) {}
  mark(dto: MarkDto) {
    if (dto.deviceId !== config.deviceId || !verifyAssertion(dto, config.signingKey, new Date())) throw new UnauthorizedException('Captura inválida o expirada');
    if (dto.mode === 'simulation' && !config.allowSimulation) throw new ForbiddenException('Simulación deshabilitada');
    return this.repo.mark(dto);
  }
}
