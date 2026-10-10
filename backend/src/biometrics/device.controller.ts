import { Body, Controller, Get, Inject, Post, UseGuards, Header } from '@nestjs/common';
import { BiometricService } from './biometric.service';
import { DeviceGuard } from './device.guard';
import { EnrollmentDto, EnrollmentAuthorizationDto } from '../common/dtos';
@Controller('device') @UseGuards(DeviceGuard)
export class DeviceController {
  constructor(@Inject(BiometricService) private readonly service: BiometricService) {}
  @Get('templates') @Header('Cache-Control', 'no-store') templates() { return this.service.templates(); }
  @Post('enrollments') enroll(@Body() dto: EnrollmentDto) { return this.service.enroll(dto); }
  @Post('enrollments/authorize') authorize(@Body() dto: EnrollmentAuthorizationDto) { return this.service.authorize(dto); }
}
