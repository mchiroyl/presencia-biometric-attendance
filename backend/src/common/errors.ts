import { ArgumentsHost, Catch, ExceptionFilter, HttpException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
export function conflictIfDuplicate(error: unknown): never {
  const e = error as { driverError?: { number?: number; originalError?: { info?: { number?: number } } } };
  const code = e.driverError?.number ?? e.driverError?.originalError?.info?.number;
  if (code === 2601 || code === 2627) throw new ConflictException('El código o correo ya existe');
  throw error;
}
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const detail = error instanceof HttpException ? error.getResponse() : { message: 'Error interno. Intente de nuevo.' };
    if (status >= 500) console.error(error instanceof QueryFailedError ? 'Fallo de persistencia' : 'Fallo interno de aplicación');
    response.status(status).json(typeof detail === 'string' ? { statusCode: status, message: detail } : { statusCode: status, ...detail });
  }
}
