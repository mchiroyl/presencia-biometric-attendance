import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepositoryPort } from '../domain/repository-ports';
import { checkPassword, hashPassword } from '../security/password';
import { LoginDto, PasswordDto } from '../common/dtos';
@Injectable()
export class AuthService {
  constructor(@Inject(AuthRepositoryPort) private readonly users: AuthRepositoryPort, @Inject(JwtService) private readonly jwt: JwtService) {}
  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());
    // Misma operación costosa cuando no existe la cuenta: reduce diferencias de tiempo.
    const dummy = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);
    const valid = await checkPassword(dto.password, user?.passwordHash ?? dummy);
    if (!user?.active || !valid) throw new UnauthorizedException('Correo o contraseña incorrectos');
    return { accessToken: await this.jwt.signAsync({ sub: user.id, role: 'admin', version: user.tokenVersion }, { expiresIn: '15m' }), expiresIn: 900, email: user.email };
  }
  async password(id: string, dto: PasswordDto) {
    const user = await this.users.findPrivateById(id);
    if (!user || !await checkPassword(dto.currentPassword, user.passwordHash)) throw new UnauthorizedException('Contraseña actual incorrecta');
    await this.users.changePassword(id, await hashPassword(dto.newPassword));
    return { message: 'Contraseña cambiada. Inicie sesión nuevamente.' };
  }
}
