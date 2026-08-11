import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '@/auth/domain';

/**
 * Resolves the authenticated principal that `JwtAuthGuard` attached to
 * `request.user` from the access token's claims. It performs NO database query
 * — it is a pure projection of the token. Fetching fresh profile data is what
 * `GET /auth/me` is for.
 *
 * `@CurrentUser()`        → the whole principal
 * `@CurrentUser('id')`    → a single field (a near drop-in for the retired
 *                           `@CurrentDoctor()` header decorator).
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthPrincipal | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthPrincipal }>();
    const user = request.user;
    if (!user) {
      // Behind the global guard this cannot happen; the throw makes a misuse
      // on a `@Public()` route fail loudly instead of returning undefined.
      throw new UnauthorizedException('No authenticated principal');
    }
    return field ? user[field] : user;
  },
);
