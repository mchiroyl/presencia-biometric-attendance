import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { config } from '../config';
import { constantTimeEqual } from '../security/crypto';
@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-device-token'];
    if (typeof token !== 'string' || !constantTimeEqual(token, config.deviceToken)) throw new UnauthorizedException('Dispositivo no autorizado');
    // Este contrato se usa desde HttpClient del puente, nunca desde scripts de navegador.
    if (req.headers.origin) throw new UnauthorizedException('Ruta exclusiva del puente');
    return true;
  }
}
