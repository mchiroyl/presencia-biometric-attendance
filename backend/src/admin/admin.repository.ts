import { encryptTemplate, decryptTemplate } from '../security/crypto';
import { config } from '../config';
import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminUser, Attendance, Biometric, Employee, EnrollmentTicket, SchoolConfig } from '../database/entities';
import { PaginationDto, AttendanceQueryDto, EmployeeCreateDto, EmployeeUpdateDto } from '../common/dtos';
import { conflictIfDuplicate } from '../common/errors';
import { AdminRepositoryPort } from '../domain/repository-ports';
@Injectable()
export class AdminRepository implements AdminRepositoryPort {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async photo(id: string) {
    const employee = await this.db.getRepository(Employee).createQueryBuilder('e').addSelect('e.encryptedPhoto').where('e.id = :id', { id }).getOne();
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    return { photoDataUrl: employee.encryptedPhoto ? decryptTemplate(employee.encryptedPhoto, config.encryptionKey) : null };
  }
  async employees(query: PaginationDto) {
    const q = this.db.getRepository(Employee).createQueryBuilder('e').orderBy('e.createdAt', 'DESC');
    if (query.search) q.where('e.fullName LIKE :search OR e.code LIKE :search', { search: `%${query.search}%` });
    const [rows, total] = await q.skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    const biometrics = rows.length ? await this.db.getRepository(Biometric).createQueryBuilder('b').where('b.employeeId IN (:...ids)', { ids: rows.map(e => e.id) }).getMany() : [];
    return { items: rows.map(e => ({ ...e, hasBiometric: biometrics.some(b => b.employeeId === e.id), biometricMode: biometrics.find(b => b.employeeId === e.id)?.mode ?? null })), total, page: query.page, limit: query.limit };
  }
  async createEmployee(dto: EmployeeCreateDto) {
    try {
      return await this.db.transaction(async manager => {
        // SQL asigna números únicos atómicamente; nunca usar count()+1 ni max()+1 al registrar.
        // La secuencia puede dejar huecos si una operación falla; los códigos no se reutilizan.
        const [sequence] = await manager.query('SELECT CONVERT(varchar(20), NEXT VALUE FOR dbo.employee_code_sequence) AS value');
        const code = `EMP-${String(sequence.value).padStart(6, '0')}`;
        const repo = manager.getRepository(Employee);
        const { photoDataUrl, ...fields } = dto;
        const value = await repo.save(repo.create({ ...fields, encryptedPhoto: encryptTemplate(photoDataUrl, config.encryptionKey), hasPhoto: true, code, fullName: dto.fullName.trim(), consentSignature: dto.consentSignature?.trim() ?? null, consentSignedAt: dto.consentSignature ? new Date() : null, consentVersion: dto.consentSignature ? '1.0' : null }));
        const { encryptedPhoto: _, ...safe } = value; return { ...safe, hasBiometric: false };
      });
    } catch (e) { return conflictIfDuplicate(e); }
  }
  async updateEmployee(id: string, dto: EmployeeUpdateDto) {
    try {
      return await this.db.transaction('SERIALIZABLE', async manager => {
        const repo = manager.getRepository(Employee);
        const employee = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!employee) throw new NotFoundException('Empleado no encontrado');
        if (dto.photoDataUrl !== undefined) { employee.encryptedPhoto = encryptTemplate(dto.photoDataUrl, config.encryptionKey); employee.hasPhoto = true; }
        if (dto.fullName !== undefined) employee.fullName = dto.fullName!.trim();
        if (Object.hasOwn(dto, 'scheduledExit')) employee.scheduledExit = dto.scheduledExit ?? null;
        if (dto.position !== undefined) employee.position = dto.position!;
        if (dto.active !== undefined) employee.active = dto.active!;
        if (Object.hasOwn(dto, 'consentSignature') && (dto.consentSignature?.trim() ?? null) !== employee.consentSignature) {
          employee.consentSignature = dto.consentSignature?.trim() ?? null;
          employee.consentSignedAt = employee.consentSignature ? new Date() : null;
          employee.consentVersion = employee.consentSignature ? '1.0' : null;
        }
        if (!employee.active || !employee.consentSignature) {
          await manager.delete(Biometric, { employeeId: id });
          await manager.delete(EnrollmentTicket, { employeeId: id });
        }
        const saved = await repo.save(employee); const { encryptedPhoto: _, ...safe } = saved; return safe;
      });
    } catch (e) { return conflictIfDuplicate(e); }
  }
  async attendance(query: AttendanceQueryDto) {
    const q = this.db.getRepository(Attendance).createQueryBuilder('a').leftJoinAndSelect('a.employee', 'e').orderBy('a.createdAt', 'DESC');
    if (query.employeeId) q.andWhere('a.employeeId = :id', { id: query.employeeId });
    if (query.date) q.andWhere('a.schoolDate = :date', { date: query.date });
    const [items, total] = await q.skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { items: items.map(a => ({ ...a, employee: { id: a.employee.id, code: a.employee.code, fullName: a.employee.fullName } })), total, page: query.page, limit: query.limit };
  }
  school() { return this.db.getRepository(SchoolConfig).findOneByOrFail({ id: 1 }); }
  async updateSchool(name: string, timeZone: string) {
    return this.db.transaction('SERIALIZABLE', async manager => {
      // El mismo registro de configuración participa en la transacción de
      // marcaje: bloqueo exclusivo antes del count impide la carrera del primer día.
      // MSSQL pessimistic_write utiliza UPDLOCK, compatible con lectores S.
      // XLOCK evita que un marcaje tome la zona vieja mientras contamos el historial.
      const rows: SchoolConfig[] = await manager.query('SELECT id, name, timeZone FROM school_config WITH (XLOCK, ROWLOCK, HOLDLOCK) WHERE id = @0', [1]);
      const school = rows[0]; if (!school) throw new NotFoundException('Configuración no encontrada');
      if (school.timeZone !== timeZone && await manager.getRepository(Attendance).count()) throw new ConflictException('La zona horaria no puede cambiar después del primer marcaje');
      school.name = name.trim(); school.timeZone = timeZone;
      return manager.getRepository(SchoolConfig).save(school);
    });
  }
  admins() { return this.db.getRepository(AdminUser).find({ order: { createdAt: 'DESC' }, take: 100 }); }
  async createAdmin(email: string, passwordHash: string) {
    try { const user = await this.db.getRepository(AdminUser).save({ email, passwordHash, active: true, tokenVersion: 0 }); const { passwordHash: _, ...safe } = user; return safe; }
    catch (e) { return conflictIfDuplicate(e); }
  }
  async deactivateAdmin(id: string) {
    const result = await this.db.getRepository(AdminUser).createQueryBuilder().update().set({ active: false, tokenVersion: () => 'tokenVersion + 1' }).where('id = :id', { id }).execute();
    if (!result.affected) throw new NotFoundException('Administrador no encontrado'); return { message: 'Administrador desactivado' };
  }
  async summary(date: string) {
    const employees = await this.db.getRepository(Employee).countBy({ active: true });
    const enrolled = await this.db.getRepository(Biometric).count();
    const marks = await this.db.getRepository(Attendance).countBy({ schoolDate: date });
    const rows = await this.db.getRepository(Attendance).createQueryBuilder('a').select('COUNT(DISTINCT a.employeeId)', 'value').where('a.schoolDate = :date', { date }).getRawOne();
    return { employees, enrolled, marks, presentToday: Number(rows.value), date };
  }
}
