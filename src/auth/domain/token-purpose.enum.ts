/**
 * Every distinct purpose a signed token can serve. Each maps (in the token
 * issuer adapter) to its OWN secret, TTL, `typ` claim, and audience. A token
 * minted for one purpose fails verification for any other: wrong secret →
 * signature failure; even under the right secret, a mismatched `typ` is
 * rejected. This is what makes "a doctor token presented at an admin endpoint"
 * fail cryptographically rather than on a mere role check.
 *
 * Admin purposes are declared (the type is stable) but unused this build.
 */
export enum TokenPurpose {
  DoctorAccess = 'DoctorAccess',
  DoctorRefresh = 'DoctorRefresh',
  AdminAccess = 'AdminAccess',
  AdminRefresh = 'AdminRefresh',
  EmailVerify = 'EmailVerify',
  PasswordReset = 'PasswordReset',
  OAuthTicket = 'OAuthTicket',
}
