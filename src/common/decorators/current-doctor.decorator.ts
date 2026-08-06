import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Resolves the acting doctor's id.
 *
 * TODO: replace with the authenticated principal once the auth module lands.
 * For now it reads an `x-doctor-id` header — a doctor id is NEVER accepted from
 * a request body.
 */
export const CurrentDoctor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const doctorId = request.header('x-doctor-id');
    if (!doctorId) {
      throw new UnauthorizedException(
        'Missing x-doctor-id header (auth not yet wired)',
      );
    }
    return doctorId;
  },
);
