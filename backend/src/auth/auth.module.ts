import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminUser } from '../database/entities';
import { config } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AdminGuard } from './auth.guard';
import { AuthRepositoryPort } from '../domain/repository-ports';
@Module({ imports: [TypeOrmModule.forFeature([AdminUser]), JwtModule.register({ secret: config.jwtSecret, signOptions: { algorithm: 'HS256' } })], controllers: [AuthController], providers: [AuthService, AuthRepository, { provide: AuthRepositoryPort, useExisting: AuthRepository }, AdminGuard], exports: [AdminGuard, AuthRepositoryPort, JwtModule] })
export class AuthModule {}
