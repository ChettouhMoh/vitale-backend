import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v7 as uuidv7 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { TokenPurpose } from '@/auth/domain';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';
import { ITokenIssuer, TokenClaims, VerifiedClaims } from '@/auth/ports';
import { DomainError } from '@/common/errors/domain.error';

/** Everything that differs per purpose: its own secret, TTL, `typ`, audience. */
interface PurposeSpec {
  secret: string;
  expiresIn: string | number;
  typ: string;
  audience: string;
  invalidCode: AuthErrorCode;
  expiredCode: AuthErrorCode;
}

const AUD_LINK = 'vitale-auth';

/**
 * JwtTokenIssuer — stateless JWT mint/verify with one secret per purpose.
 *
 * Two independent barriers stop a token minted for one purpose being used as
 * another: (1) each purpose signs with its OWN secret, so a cross-purpose token
 * fails signature verification; (2) every token carries a `typ` claim that
 * `verify` re-asserts, so even if two purposes ever shared a secret the `typ`
 * mismatch is rejected. Library errors are mapped to purpose-appropriate
 * `DomainError`s (expired vs invalid) so callers never parse jsonwebtoken.
 */
@Injectable()
export class JwtTokenIssuer implements ITokenIssuer {
  private readonly specs: Record<TokenPurpose, PurposeSpec>;

  constructor(config: ConfigService) {
    const doctorAccessTtl = config.get<string>('JWT_DOCTOR_ACCESS_TTL', '1h');
    const doctorRefreshTtl = config.get<string>(
      'JWT_DOCTOR_REFRESH_TTL',
      '24h',
    );

    // Access/refresh failures are indistinguishable to the client — both mean
    // "log in again" — so they share UNAUTHENTICATED. Link/ticket tokens get
    // specific invalid/expired codes so the UI can say "this link expired".
    const A = AuthErrorCode.UNAUTHENTICATED;

    this.specs = {
      [TokenPurpose.DoctorAccess]: {
        secret: config.getOrThrow<string>('JWT_DOCTOR_ACCESS_SECRET'),
        expiresIn: doctorAccessTtl,
        typ: 'access',
        audience: 'vitale-doctor',
        invalidCode: A,
        expiredCode: A,
      },
      [TokenPurpose.DoctorRefresh]: {
        secret: config.getOrThrow<string>('JWT_DOCTOR_REFRESH_SECRET'),
        expiresIn: doctorRefreshTtl,
        typ: 'refresh',
        audience: 'vitale-doctor',
        invalidCode: A,
        expiredCode: A,
      },
      [TokenPurpose.AdminAccess]: {
        secret: config.getOrThrow<string>('JWT_ADMIN_ACCESS_SECRET'),
        expiresIn: '15m',
        typ: 'access',
        audience: 'vitale-admin',
        invalidCode: A,
        expiredCode: A,
      },
      [TokenPurpose.AdminRefresh]: {
        secret: config.getOrThrow<string>('JWT_ADMIN_REFRESH_SECRET'),
        expiresIn: '12h',
        typ: 'refresh',
        audience: 'vitale-admin',
        invalidCode: A,
        expiredCode: A,
      },
      [TokenPurpose.EmailVerify]: {
        secret: config.getOrThrow<string>('JWT_EMAIL_VERIFY_SECRET'),
        expiresIn: '7m',
        typ: 'email_verify',
        audience: AUD_LINK,
        invalidCode: AuthErrorCode.VERIFICATION_TOKEN_INVALID,
        expiredCode: AuthErrorCode.VERIFICATION_TOKEN_EXPIRED,
      },
      [TokenPurpose.PasswordReset]: {
        secret: config.getOrThrow<string>('JWT_PASSWORD_RESET_SECRET'),
        expiresIn: '15m',
        typ: 'password_reset',
        audience: AUD_LINK,
        invalidCode: AuthErrorCode.RESET_TOKEN_INVALID,
        expiredCode: AuthErrorCode.RESET_TOKEN_EXPIRED,
      },
      [TokenPurpose.OAuthTicket]: {
        secret: config.getOrThrow<string>('JWT_OAUTH_TICKET_SECRET'),
        expiresIn: '30m',
        typ: 'oauth_registration',
        audience: AUD_LINK,
        invalidCode: AuthErrorCode.REGISTRATION_TICKET_INVALID,
        expiredCode: AuthErrorCode.REGISTRATION_TICKET_EXPIRED,
      },
    };
  }

  issue(purpose: TokenPurpose, claims: TokenClaims): string {
    const spec = this.specs[purpose];
    const { sub, ...rest } = claims;
    return jwt.sign({ ...rest, typ: spec.typ }, spec.secret, {
      subject: sub,
      audience: spec.audience,
      jwtid: uuidv7(),
      // jsonwebtoken accepts a duration string ('1h') or seconds at runtime; the
      // union is narrowed to satisfy its strict `expiresIn` typing.
      expiresIn: spec.expiresIn as number,
    });
  }

  verify<T extends VerifiedClaims = VerifiedClaims>(
    purpose: TokenPurpose,
    token: string,
  ): T {
    const spec = this.specs[purpose];
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, spec.secret, { audience: spec.audience });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new DomainError(spec.expiredCode, 'Token has expired', 401);
      }
      // JsonWebTokenError (bad signature/audience), NotBeforeError, etc.
      throw new DomainError(spec.invalidCode, 'Token is invalid', 401);
    }

    // `typ` is the second barrier: reject a token that verified under this
    // secret but was minted for a different purpose.
    if (typeof decoded === 'string' || decoded.typ !== spec.typ) {
      throw new DomainError(spec.invalidCode, 'Token is invalid', 401);
    }

    return decoded as T;
  }
}
