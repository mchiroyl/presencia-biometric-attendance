import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminUser, Biometric, Employee, EnrollmentTicket } from '../database/entities';
import { createHash } from 'node:crypto';
import { config } from '../config';
import { decryptTemplate, encryptTemplate } from '../security/crypto';
import { BiometricRepositoryPort } from '../domain/repository-ports';
import { templateFormat } from './template-format';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class BiometricRepository implements BiometricRepositoryPort {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async authorizeEnrollment(employeeId: string, token: string) {
    const employee = await this.db.getRepository(Employee).findOneBy({ id: employeeId });
    if (!employee?.active || !employee.consentSignedAt) throw new ForbiddenException('Consentimiento o empleado inválido');
    const ticket = await this.db.getRepository(EnrollmentTicket).findOneBy({ tokenHash: digest(token), employeeId });
    if (!ticket || ticket.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Ticket inválido o expirado');
    if (ticket.usedAt) throw new ConflictException('Ticket ya utilizado');
    const admin = await this.db.getRepository(AdminUser).findOneBy({ id: ticket.adminId });
    if (!admin?.active || admin.tokenVersion !== ticket.adminVersion) throw new UnauthorizedException('Autorización administrativa revocada');
    // Solo preautoriza captura; enroll vuelve a comprobarlo todo dentro de su transacción.
    return { employeeId };
  }
  async issueTicket(employeeId: string, token: string, adminId: string, adminVersion: number) {
    return this.db.transaction('SERIALIZABLE', async manager => {
      const employee = await manager.findOne(Employee, { where: { id: employeeId }, lock: { mode: 'pessimistic_write' } });
      if (!employee) throw new NotFoundException('Empleado no encontrado');
      if (!employee.active || !employee.consentSignedAt) throw new ForbiddenException('Se requiere empleado activo y consentimiento firmado');
      await manager.delete(EnrollmentTicket, { employeeId });
      await manager.save(EnrollmentTicket, { employeeId, tokenHash: digest(token), expiresAt: new Date(Date.now() + 120000), usedAt: null, adminId, adminVersion });
    });
  }
  async enroll(employeeId: string, token: string, fmd: string, mode: 'hardware' | 'simulation') {
    return this.db.transaction('SERIALIZABLE', async manager => {
      const employee = await manager.findOne(Employee, { where: { id: employeeId }, lock: { mode: 'pessimistic_write' } });
      if (!employee?.active || !employee.consentSignedAt) throw new ForbiddenException('Consentimiento o empleado inválido');
      const ticket = await manager.findOne(EnrollmentTicket, { where: { tokenHash: digest(token), employeeId }, lock: { mode: 'pessimistic_write' } });
      if (!ticket) throw new UnauthorizedException('Ticket inválido');
      if (ticket.usedAt) throw new ConflictException('Ticket ya utilizado');
      if (ticket.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Ticket expirado');
      const admin = await manager.findOneBy(AdminUser, { id: ticket.adminId });
      if (!admin?.active || admin.tokenVersion !== ticket.adminVersion) throw new UnauthorizedException('Autorización administrativa revocada');
      if (mode === 'simulation' && !config.allowSimulation) throw new ForbiddenException('Simulación deshabilitada');
      const format = templateFormat(fmd, mode);
      if (!format) throw new BadRequestException('Formato de plantilla inválido');
      const repo = manager.getRepository(Biometric); const existing = await repo.findOneBy({ employeeId });
      await repo.save({ id: existing?.id, employeeId, encryptedFmd: encryptTemplate(fmd, config.encryptionKey), format, mode });
      ticket.usedAt = new Date(); await manager.save(ticket);
      return { employeeId, message: 'Huella registrada', mode };
    });
  }
  async templates() {
    const rows = await this.db.getRepository(Biometric).createQueryBuilder('b').addSelect('b.encryptedFmd').innerJoin(Employee, 'e', 'e.id = b.employeeId').where('e.active = :active', { active: true }).andWhere('e.consentSignedAt IS NOT NULL').getMany();
    return rows.filter(b => b.mode !== 'simulation' || config.allowSimulation).map(b => ({ employeeId: b.employeeId, fmd: decryptTemplate(b.encryptedFmd, config.encryptionKey), mode: b.mode }));
  }
}
