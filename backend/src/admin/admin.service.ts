import { normalizePhoto } from './employee-photo';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AdminRepositoryPort } from '../domain/repository-ports';
import { AdminCreateDto, AttendanceQueryDto, EmployeeCreateDto, EmployeeUpdateDto, PaginationDto, SchoolDto } from '../common/dtos';
import { hashPassword } from '../security/password';
import { schoolDate } from '../attendance/attendance-policy';
@Injectable()
export class AdminService {
  constructor(@Inject(AdminRepositoryPort) private readonly repo: AdminRepositoryPort) {}
  employees(q: PaginationDto) { return this.repo.employees(q); }
  async create(dto: EmployeeCreateDto) { dto.photoDataUrl = await normalizePhoto(dto.photoDataUrl); return this.repo.createEmployee(dto); }
  photo(id: string) { return this.repo.photo(id); }
  async update(id: string, dto: EmployeeUpdateDto) {
    if (Object.hasOwn(dto, 'photoDataUrl')) dto.photoDataUrl = await normalizePhoto(dto.photoDataUrl);
    if (['fullName', 'position', 'active'].some(k => Object.hasOwn(dto, k) && (dto as any)[k] === null)) throw new BadRequestException('Campo requerido no admite null');
    return this.repo.updateEmployee(id, dto);
  }
  remove(id: string) { return this.repo.updateEmployee(id, { active: false }); }
  attendance(q: AttendanceQueryDto) {
    if (q.date && (!Number.isFinite(Date.parse(q.date)) || new Date(q.date).toISOString().slice(0, 10) !== q.date)) throw new BadRequestException('Fecha inválida');
    return this.repo.attendance(q);
  }
  school() { return this.repo.school(); }
  updateSchool(dto: SchoolDto) {
    try { new Intl.DateTimeFormat('es-GT', { timeZone: dto.timeZone }); } catch { throw new BadRequestException('Zona horaria IANA inválida'); }
    return this.repo.updateSchool(dto.name, dto.timeZone);
  }
  admins() { return this.repo.admins(); }
  async createAdmin(dto: AdminCreateDto) { return this.repo.createAdmin(dto.email.toLowerCase(), await hashPassword(dto.password)); }
  deactivateAdmin(id: string, requester: string) { if (id === requester) throw new ForbiddenException('No puede desactivar su propia cuenta'); return this.repo.deactivateAdmin(id); }
  async summary() { const school = await this.repo.school(); return this.repo.summary(schoolDate(new Date(), school.timeZone)); }
}
