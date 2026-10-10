import { Body, Controller, Inject, Post } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkDto } from '../common/dtos';
@Controller('attendance')
export class AttendanceController {
  constructor(@Inject(AttendanceService) private readonly service: AttendanceService) {}
  @Post('mark') mark(@Body() dto: MarkDto) { return this.service.mark(dto); }
}
