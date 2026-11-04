import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, JwtPayload } from './auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token =
      request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);

      if (
        !Number.isSafeInteger(payload.sub) ||
        payload.sub <= 0 ||
        typeof payload.nickname !== 'string' ||
        !payload.nickname.trim() ||
        !Number.isInteger(payload.exp)
      ) {
        throw new UnauthorizedException();
      }

      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }
}
