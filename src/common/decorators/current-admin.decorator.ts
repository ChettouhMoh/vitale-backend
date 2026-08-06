import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Resolves the acting admin's id (the verifier).
 *
 * TODO: replace with the authenticated principal + role check once the auth
 * module lands. For now it reads an `x-admin-id` header — never accepted from a
 * request body.
 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const adminId = request.header('x-admin-id');
    if (!adminId) {
      throw new UnauthorizedException(
        'Missing x-admin-id header (admin auth not yet wired)',
      );
    }
    return adminId;
  },
);
