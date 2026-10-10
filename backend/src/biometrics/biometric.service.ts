import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { BiometricRepositoryPort } from '../domain/repository-ports';
import { EnrollmentDto, EnrollmentAuthorizationDto } from '../common/dtos';
@Injectable()
export class BiometricService {
  constructor(@Inject(BiometricRepositoryPort) private readonly repo: BiometricRepositoryPort, @Inject(JwtService) private readonly jwt: JwtService) {}
  async ticket(employeeId: string, adminId: string, version: number) {
    const token = await this.jwt.signAsync({ sub: employeeId, purpose: 'enroll', jti: randomUUID() }, { expiresIn: '120s', audience: 'device-enrollment' });
    await this.repo.issueTicket(employeeId, token, adminId, version); return { ticket: token, expiresIn: 120 };
  }
  async enroll(dto: EnrollmentDto) {
    let payload: any;
    try { payload = await this.jwt.verifyAsync(dto.ticket, { algorithms: ['HS256'], audience: 'device-enrollment' }); if (payload.purpose !== 'enroll') throw new Error(); }
    catch { throw new UnauthorizedException('Ticket inválido o expirado'); }
    return this.repo.enroll(payload.sub, dto.ticket, dto.fmd, dto.mode);
  }
  async authorize(dto: EnrollmentAuthorizationDto) {
    let payload: any;
    try { payload = await this.jwt.verifyAsync(dto.ticket, { algorithms: ['HS256'], audience: 'device-enrollment' }); if (payload.purpose !== 'enroll') throw new Error(); }
    catch { throw new UnauthorizedException('Ticket inválido o expirado'); }
    return this.repo.authorizeEnrollment(payload.sub, dto.ticket);
  }
  templates() { return this.repo.templates(); }
}
