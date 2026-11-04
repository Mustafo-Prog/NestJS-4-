import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  nickname: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
