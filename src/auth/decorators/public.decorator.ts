import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Marks an endpoint as reachable without authentication. Required because
 * `JwtAuthGuard` is registered globally and default-denies — without `@Public()`
 * a new endpoint is locked, which is the safe failure mode.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
