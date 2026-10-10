import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../database/entities';
import { AuthRepositoryPort } from '../domain/repository-ports';
@Injectable()
export class AuthRepository implements AuthRepositoryPort {
  constructor(@InjectRepository(AdminUser) private readonly users: Repository<AdminUser>) {}
  findByEmail(email: string) { return this.users.createQueryBuilder('user').addSelect('user.passwordHash').where('user.email = :email', { email }).getOne(); }
  findById(id: string) { return this.users.findOneBy({ id }); }
  findPrivateById(id: string) { return this.users.createQueryBuilder('user').addSelect('user.passwordHash').where('user.id = :id', { id }).getOne(); }
  async changePassword(id: string, hash: string) { await this.users.createQueryBuilder().update().set({ passwordHash: hash, tokenVersion: () => 'tokenVersion + 1' }).where('id = :id', { id }).execute(); }
}
