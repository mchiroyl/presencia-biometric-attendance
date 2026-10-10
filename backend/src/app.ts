import { NestExpressApplication } from '@nestjs/platform-express';
import 'reflect-metadata';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import helmet from 'helmet';
import { config } from './config';
import { dbOptions } from './database/options';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BiometricModule } from './biometrics/biometric.module';
import { HealthController } from './health.controller';
import { SafeExceptionFilter } from './common/errors';
@Module({ imports: [TypeOrmModule.forRoot(dbOptions()), ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), AuthModule, AdminModule, AttendanceModule, BiometricModule], controllers: [HealthController], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }] })
export class AppModule {}
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn'], abortOnError: false });
  app.useBodyParser('json', { limit: '3mb' });
  app.use(helmet());
  app.enableCors({ origin: config.allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: false });
  app.use((_req: any, res: any, next: () => void) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, validationError: { target: false, value: false } }));
  app.useGlobalFilters(new SafeExceptionFilter());
  app.enableShutdownHooks(); return app;
}
