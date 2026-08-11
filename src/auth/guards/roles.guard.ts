import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthPrincipal, Role } from '@/auth/domain';
import { ROLES_KEY } from '@/auth/decorators';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

/**
 * RolesGuard — enforces `@RequireRoles(...)`. Registered globally; a no-op when
 * an endpoint declares no roles. Runs AFTER `JwtAuthGuard`, so `request.user`
 * is populated.
 *
 * SuperAdmin is a wildcard granted here, BEFORE any role matching — it is never
 * listed on an endpoint. If superadmin ever fails a check, fix this line, not
 * the decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthPrincipal }>();
    const user = request.user;
    if (!user) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Authentication required',
        401,
      );
    }

    if (user.role === Role.SuperAdmin) {
      return true;
    }
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    throw new DomainError(
      AuthErrorCode.FORBIDDEN,
      'Insufficient role for this resource',
      403,
    );
  }
}
