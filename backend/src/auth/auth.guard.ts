import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepositoryPort } from '../domain/repository-ports';
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService, @Inject(AuthRepositoryPort) private readonly users: AuthRepositoryPort) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) throw new UnauthorizedException('Inicie sesión');
    try {
      const payload = await this.jwt.verifyAsync(header.slice(7), { algorithms: ['HS256'] });
      if (payload.role !== 'admin' || typeof payload.sub !== 'string') throw new Error();
      const user = await this.users.findById(payload.sub);
      if (!user?.active || user.tokenVersion !== payload.version) throw new Error();
      req.admin = { id: user.id, email: user.email, version: user.tokenVersion }; return true;
    } catch { throw new UnauthorizedException('Sesión inválida o expirada'); }
  }
}
