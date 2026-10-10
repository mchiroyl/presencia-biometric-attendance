import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchoolConfig } from './database/entities';
import { config } from './config';
@Controller()
export class HealthController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  @Get('health') async health() { try { await this.db.query('SELECT 1 AS ok'); return { status: 'ok', database: 'connected', simulation: config.allowSimulation }; } catch { throw new ServiceUnavailableException('Base de datos no disponible'); } }
  @Get('school') async school() { return this.db.getRepository(SchoolConfig).findOneByOrFail({ id: 1 }); }
}
