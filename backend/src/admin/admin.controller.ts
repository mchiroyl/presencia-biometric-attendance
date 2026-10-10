import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/auth.guard';
import { AdminService } from './admin.service';
import { BiometricService } from '../biometrics/biometric.service';
import { AdminCreateDto, AttendanceQueryDto, EmployeeCreateDto, EmployeeUpdateDto, PaginationDto, SchoolDto } from '../common/dtos';
@Controller('admin') @UseGuards(AdminGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly service: AdminService, @Inject(BiometricService) private readonly biometric: BiometricService) {}
  @Get('employees') employees(@Query() q: PaginationDto) { return this.service.employees(q); }
  @Get('employees/:id/photo') photo(@Param('id', ParseUUIDPipe) id: string) { return this.service.photo(id); }
  @Post('employees') create(@Body() dto: EmployeeCreateDto) { return this.service.create(dto); }
  @Patch('employees/:id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EmployeeUpdateDto) { return this.service.update(id, dto); }
  @Delete('employees/:id') remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }
  @Post('employees/:id/enrollment-ticket') ticket(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.biometric.ticket(id, req.admin.id, req.admin.version); }
  @Get('attendance') attendance(@Query() q: AttendanceQueryDto) { return this.service.attendance(q); }
  @Get('summary') summary() { return this.service.summary(); }
  @Get('school') school() { return this.service.school(); }
  @Patch('school') updateSchool(@Body() dto: SchoolDto) { return this.service.updateSchool(dto); }
  @Get('users') users() { return this.service.admins(); }
  @Post('users') createUser(@Body() dto: AdminCreateDto) { return this.service.createAdmin(dto); }
  @Delete('users/:id') deleteUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.service.deactivateAdmin(id, req.admin.id); }
}
