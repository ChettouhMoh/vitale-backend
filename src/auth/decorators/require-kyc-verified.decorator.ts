import { SetMetadata } from '@nestjs/common';

export const KYC_VERIFIED_KEY = 'auth:kycVerified';

/**
 * Gates an endpoint behind a verified KYC status. `KycVerifiedGuard` reads the
 * `kycStatus` claim straight from the token — no database query — so this is
 * cheap to apply broadly to patient-data routes.
 */
export const RequireKycVerified = () => SetMetadata(KYC_VERIFIED_KEY, true);
