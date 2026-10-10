import { Body, Controller, Inject, Post, Get, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginDto, PasswordDto } from '../common/dtos';
import { AuthService } from './auth.service';
import { AdminGuard } from './auth.guard';
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}
  @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } }) login(@Body() dto: LoginDto) { return this.service.login(dto); }
  @Get('me') @UseGuards(AdminGuard) me(@Req() req: any) { return { email: req.admin.email }; }
  @Post('password') @UseGuards(AdminGuard) password(@Req() req: any, @Body() dto: PasswordDto) { return this.service.password(req.admin.id, dto); }
}
