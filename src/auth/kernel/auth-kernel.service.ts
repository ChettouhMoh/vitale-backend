import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { AuthPrincipal, SessionPolicy } from '@/auth/domain';
import {
  AuthSubject,
  IAuthSubjectStore,
  IDoctorOAuthLinkRepository,
  IPasswordHasher,
  ITokenIssuer,
  OAuthIdentity,
} from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

const STATE_COOKIE_TYP = 'oauth_state';
const STATE_COOKIE_NAME = 'vitale_oauth_state';
const TICKET_COOKIE_NAME = 'vitale_oauth_ticket';
// Scoped: the registration ticket is only ever sent to the completion endpoint.
const TICKET_COOKIE_PATH = '/v1/auth/oauth/complete';

/** Ephemeral state carried in the signed OAuth-state cookie between redirect and callback. */
export interface OAuthStatePayload {
  provider: string;
  state: string;
  codeVerifier: string;
  /** Set on the authenticated link flow — the doctor initiating the link. */
  linkDoctorId?: string;
}

/** The outcome of resolving an OAuth callback identity through the decision table. */
export type OAuthResolution =
  | { kind: 'session'; subjectId: string }
  | { kind: 'register'; identity: OAuthIdentity };

/**
 * AuthKernel — the actor-agnostic core the use-case controllers orchestrate.
 * It owns password authentication (the login decision table), the OAuth callback
 * decision table (including the pre-hijacking defence), session cookie
 * issuance/clearing, and the signed OAuth-state cookie. It never imports the
 * `Doctor` aggregate — only `AuthSubject`.
 */
@Injectable()
export class AuthKernel {
  private readonly isProd: boolean;
  private readonly cookieDomain?: string;
  private readonly stateSecret: string;
  private dummyHash?: string;

  constructor(
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(IPasswordHasher) private readonly hasher: IPasswordHasher,
    @Inject(IDoctorOAuthLinkRepository)
    private readonly oauthLinks: IDoctorOAuthLinkRepository,
    @Inject(IEventBus) private readonly events: IEventBus,
    config: ConfigService,
  ) {
    this.isProd =
      config.get<string>('NODE_ENV', 'development') === 'production';
    this.cookieDomain = config.get<string>('COOKIE_DOMAIN');
    // The state cookie shares the registration-ticket secret: it lives in the
    // same pre-authentication security domain and never authorizes anything on
    // its own. `typ` keeps it distinct from a registration ticket.
    this.stateSecret = config.getOrThrow<string>('JWT_OAUTH_TICKET_SECRET');
  }

  // ─── Password login ─────────────────────────────────────────────────────────

  /**
   * The login decision table. Every failure is a `DomainError`; success returns
   * the subject. Timing is equalised: the no-user and OAuth-only branches run a
   * dummy argon2 verify so they cost the same as a real password check, denying
   * a timing oracle for account existence.
   */
  async authenticatePassword(
    email: string,
    password: string,
  ): Promise<AuthSubject> {
    const subject = await this.subjects.findByEmail(email.trim().toLowerCase());

    if (!subject) {
      await this.burnPasswordTime(password);
      throw this.invalidCredentials();
    }

    // OAuth-only account: same generic error as a wrong password. Revealing
    // "this account exists but uses Google" is account enumeration. No state
    // change, no email — an unauthenticated request never mutates account state.
    if (subject.passwordHash === null) {
      await this.burnPasswordTime(password);
      throw this.invalidCredentials();
    }

    const ok = await this.hasher.verify(subject.passwordHash, password);
    if (!ok) {
      throw this.invalidCredentials();
    }

    // Reachable ONLY after a correct password, so it leaks nothing an attacker
    // did not already prove.
    if (!subject.emailVerified) {
      throw new DomainError(
        AuthErrorCode.EMAIL_NOT_VERIFIED,
        'Email address is not verified',
        403,
      );
    }

    if (!subject.canLogin) {
      throw new DomainError(
        AuthErrorCode.ACCOUNT_NOT_ACTIVE,
        'Account is not active',
        403,
      );
    }

    return subject;
  }

  private invalidCredentials(): DomainError {
    return new DomainError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      401,
    );
  }

  /** Burn ~one argon2 verify of time so existence/OAuth-only branches match a real check. */
  private async burnPasswordTime(password: string): Promise<void> {
    if (!this.dummyHash) {
      this.dummyHash = await this.hasher.hash('vitale-timing-equaliser');
    }
    await this.hasher.verify(this.dummyHash, password);
  }

  // ─── Session cookies ────────────────────────────────────────────────────────

  /** Sign access + refresh tokens for a subject and set both httpOnly cookies. */
  issueSession(
    res: Response,
    subject: AuthSubject,
    policy: SessionPolicy = SessionPolicy.DOCTOR,
  ): void {
    const accessToken = this.tokens.issue(policy.accessPurpose, {
      sub: subject.id,
      role: subject.role,
      email: subject.email,
      kycStatus: subject.kycStatus,
    });
    const refreshToken = this.tokens.issue(policy.refreshPurpose, {
      sub: subject.id,
      role: subject.role,
    });

    // Access: sent on every request (path '/'), sameSite lax.
    res.cookie(policy.accessCookieName, accessToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: policy.accessTtlMs,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    });
    // Refresh: scoped to the ONE endpoint that consumes it, sameSite strict.
    res.cookie(policy.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      path: policy.refreshCookiePath,
      maxAge: policy.refreshTtlMs,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    });
  }

  /** Load a subject by id and issue its session (refresh + OAuth callback paths). */
  async issueSessionById(
    res: Response,
    subjectId: string,
    policy: SessionPolicy = SessionPolicy.DOCTOR,
  ): Promise<AuthPrincipal> {
    const subject = await this.subjects.findById(subjectId);
    if (!subject) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Subject no longer exists',
        401,
      );
    }
    this.issueSession(res, subject, policy);
    return this.toPrincipal(subject);
  }

  /** Expire both session cookies (logout). Path must match the set path exactly. */
  clearSession(
    res: Response,
    policy: SessionPolicy = SessionPolicy.DOCTOR,
  ): void {
    const base = {
      httpOnly: true,
      secure: this.isProd,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
    res.clearCookie(policy.accessCookieName, {
      ...base,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie(policy.refreshCookieName, {
      ...base,
      sameSite: 'strict',
      path: policy.refreshCookiePath,
    });
  }

  toPrincipal(subject: AuthSubject): AuthPrincipal {
    return {
      id: subject.id,
      role: subject.role,
      email: subject.email,
      kycStatus: subject.kycStatus,
      jti: '', // populated from the token on the guard path; unused here
    };
  }

  // ─── OAuth callback decision table ──────────────────────────────────────────

  /**
   * Resolve a verified OAuth identity to an action. Order is load-bearing — see
   * the numbered rows. The pre-hijacking defence is row 6.
   */
  async resolveOAuthCallback(
    identity: OAuthIdentity,
  ): Promise<OAuthResolution> {
    // Row 1 — the provider must have proven the email. Without this the whole
    // "the provider wins" logic downstream is unfounded.
    if (!identity.emailVerified) {
      throw new DomainError(
        AuthErrorCode.PROVIDER_EMAIL_NOT_VERIFIED,
        'The provider has not verified this email',
        400,
      );
    }

    // Row 2 — this provider identity is already linked → it IS this doctor.
    const link = await this.oauthLinks.findByProviderIdentity(
      identity.provider,
      identity.providerUserId,
    );
    if (link) {
      const subject = await this.subjects.findById(link.doctorId);
      // A suspended doctor must not slip in through OAuth while blocked on
      // password login.
      this.assertCanLogin(subject);
      return { kind: 'session', subjectId: link.doctorId };
    }

    const doctor = await this.subjects.findByEmail(
      identity.email.trim().toLowerCase(),
    );

    // Row 4 — brand-new: no link, no local account → registration ticket.
    if (!doctor) {
      return { kind: 'register', identity };
    }

    // Row 3 — the account already has an identity from THIS provider (a
    // different providerUserId). One identity per provider per doctor; reject.
    const doctorLinks = await this.oauthLinks.findByDoctor(doctor.id);
    if (doctorLinks.some((l) => l.provider === identity.provider)) {
      throw new DomainError(
        AuthErrorCode.OAUTH_ACCOUNT_ALREADY_LINKED,
        'This account is already linked to a different provider identity',
        409,
      );
    }

    // Row 5 — a proven local account (email verified): link + login.
    if (doctor.emailVerified) {
      this.assertCanLogin(doctor);
      await this.oauthLinks.link(
        doctor.id,
        identity.provider,
        identity.providerUserId,
      );
      return { kind: 'session', subjectId: doctor.id };
    }

    // Row 6 — PRE-HIJACKING DEFENCE. The local account never proved it owns
    // this email — anyone can type an address into a signup form. The provider
    // cryptographically proved it. Therefore the unproven password is
    // DESTROYED, not preserved: an attacker who pre-registered the victim's
    // email and never verified is locked out permanently, while the legitimate
    // owner (who simply never clicked the link) recovers via forgot-password.
    // Do not "simplify" this into a naive merge that keeps the password.
    await this.subjects.clearPassword(doctor.id);
    await this.subjects.markEmailVerified(doctor.id);
    await this.oauthLinks.link(
      doctor.id,
      identity.provider,
      identity.providerUserId,
    );
    await this.events.emit('auth.pending_account_claimed', {
      credentialId: doctor.id,
      email: doctor.email,
      locale: identity.locale ?? 'fr',
    });
    return { kind: 'session', subjectId: doctor.id };
  }

  private assertCanLogin(subject: AuthSubject | null): void {
    if (!subject) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Subject no longer exists',
        401,
      );
    }
    if (!subject.canLogin) {
      throw new DomainError(
        AuthErrorCode.ACCOUNT_NOT_ACTIVE,
        'Account is not active',
        403,
      );
    }
  }

  /**
   * Link a provider identity to an already-authenticated doctor (the link flow).
   * Guards that the doctor does not already have an identity from this provider,
   * and that this providerUserId is not linked elsewhere (the repository's
   * uniqueness enforces the latter).
   */
  async linkIdentity(doctorId: string, identity: OAuthIdentity): Promise<void> {
    if (!identity.emailVerified) {
      throw new DomainError(
        AuthErrorCode.PROVIDER_EMAIL_NOT_VERIFIED,
        'The provider has not verified this email',
        400,
      );
    }
    const existing = await this.oauthLinks.findByDoctor(doctorId);
    if (existing.some((l) => l.provider === identity.provider)) {
      throw new DomainError(
        AuthErrorCode.OAUTH_ACCOUNT_ALREADY_LINKED,
        'This account is already linked to this provider',
        409,
      );
    }
    // Repository throws OAUTH_ACCOUNT_ALREADY_LINKED if this providerUserId
    // belongs to another doctor.
    await this.oauthLinks.link(
      doctorId,
      identity.provider,
      identity.providerUserId,
    );
  }

  /** Fresh CSRF `state` + PKCE verifier/challenge for an OAuth authorization request. */
  generatePkce(): {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
  } {
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { state, codeVerifier, codeChallenge };
  }

  // ─── OAuth state cookie (signed, short-lived) ───────────────────────────────

  buildStateCookie(payload: OAuthStatePayload): {
    name: string;
    value: string;
  } {
    const value = jwt.sign(
      { ...payload, typ: STATE_COOKIE_TYP },
      this.stateSecret,
      { expiresIn: '10m' },
    );
    return { name: STATE_COOKIE_NAME, value };
  }

  readStateCookie(raw: string | undefined): OAuthStatePayload {
    if (!raw) {
      throw this.stateMismatch();
    }
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(raw, this.stateSecret);
    } catch {
      throw this.stateMismatch();
    }
    if (typeof decoded === 'string' || decoded.typ !== STATE_COOKIE_TYP) {
      throw this.stateMismatch();
    }
    return {
      provider: decoded.provider as string,
      state: decoded.state as string,
      codeVerifier: decoded.codeVerifier as string,
      linkDoctorId: decoded.linkDoctorId as string | undefined,
    };
  }

  stateCookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
    domain?: string;
  } {
    return {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax', // must survive the top-level redirect back from the provider
      path: '/',
      maxAge: 10 * 60 * 1000,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }

  stateCookieName(): string {
    return STATE_COOKIE_NAME;
  }

  // ─── OAuth registration-ticket cookie (carries the signed 30m ticket) ───────

  setTicketCookie(res: Response, ticket: string): void {
    res.cookie(TICKET_COOKIE_NAME, ticket, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      path: TICKET_COOKIE_PATH,
      maxAge: 30 * 60 * 1000,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    });
  }

  readTicketCookie(
    cookies: Record<string, string> | undefined,
  ): string | undefined {
    return cookies?.[TICKET_COOKIE_NAME];
  }

  clearTicketCookie(res: Response): void {
    res.clearCookie(TICKET_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      path: TICKET_COOKIE_PATH,
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    });
  }

  private stateMismatch(): DomainError {
    return new DomainError(
      AuthErrorCode.OAUTH_STATE_MISMATCH,
      'OAuth state is missing or does not match',
      400,
    );
  }
}
