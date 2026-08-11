import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  AuthPrincipal,
  Role,
  SessionPolicy,
  TokenPurpose,
} from '@/auth/domain';
import { ITokenIssuer } from '@/auth/ports';
import { IS_PUBLIC_KEY } from '@/auth/decorators';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

type RequestWithCookies = Request & {
  cookies?: Record<string, string>;
  user?: AuthPrincipal;
};

/**
 * JwtAuthGuard — registered GLOBALLY (APP_GUARD) and default-deny: an endpoint
 * without `@Public()` is locked. It reads the access cookie, verifies its
 * signature AND `typ === 'access'` (via the token issuer), and attaches the
 * principal to `request.user`. No database query — the principal is a pure
 * projection of the token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const token = request.cookies?.[SessionPolicy.DOCTOR.accessCookieName];
    if (!token) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Authentication required',
        401,
      );
    }

    // Throws DomainError(UNAUTHENTICATED, 401) on bad signature/expiry/typ.
    const claims = this.tokens.verify(TokenPurpose.DoctorAccess, token);

    request.user = {
      id: claims.sub,
      role: claims.role as Role,
      email: claims.email as string,
      kycStatus: claims.kycStatus as string,
      jti: claims.jti,
    };
    return true;
  }
}
