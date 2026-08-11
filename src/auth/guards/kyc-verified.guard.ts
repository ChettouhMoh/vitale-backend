import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthPrincipal } from '@/auth/domain';
import { KYC_VERIFIED_KEY } from '@/auth/decorators';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

/** The doctor `verificationStatus` value that means KYC is approved. */
const KYC_VERIFIED = 'verified';

/**
 * KycVerifiedGuard — enforces `@RequireKycVerified()`, gating patient-data
 * routes. Reads `kycStatus` from the token claims (no DB query). Registered
 * globally; a no-op when the decorator is absent.
 *
 * A doctor whose email is verified but whose KYC is still pending CAN log in
 * (they must, to submit their KYC documents) — this guard is what keeps them out
 * of patient data until an admin approves them.
 */
@Injectable()
export class KycVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      KYC_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
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
    if (user.kycStatus !== KYC_VERIFIED) {
      throw new DomainError(
        AuthErrorCode.KYC_NOT_VERIFIED,
        'KYC verification is required for this resource',
        403,
      );
    }
    return true;
  }
}
