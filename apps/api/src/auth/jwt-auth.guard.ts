import { createParamDecorator, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from './jwt.strategy.js';

/** Exige `Authorization: Bearer <accessToken>` válido. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** Inyecta el usuario autenticado en un handler protegido por JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>().user,
);
