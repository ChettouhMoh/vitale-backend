import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DoctorModule } from '@/doctor/doctor.module';
import { IOAuthProvider, IPasswordHasher, ITokenIssuer } from './ports';
import {
  Argon2PasswordHasher,
  GoogleOAuthProvider,
  JwtTokenIssuer,
} from './infra';
import { AuthKernel, OAUTH_PROVIDERS, OAuthProviderRegistry } from './kernel';
import { JwtAuthGuard } from './guards';
import {
  ChangePasswordController,
  CompleteOAuthSignupController,
  DoctorLoginController,
  DoctorSignupController,
  LinkOAuthProviderController,
  LogoutController,
  MeController,
  OAuthCallbackController,
  OAuthRedirectController,
  RefreshSessionController,
  RequestPasswordResetController,
  ResendVerificationController,
  ResetPasswordController,
  SetPasswordController,
  UnlinkOAuthProviderController,
  VerifyEmailController,
} from './use-cases';

/**
 * Auth bounded context — authentication only. It depends on the doctor module
 * (for `IAuthSubjectStore` + `IDoctorRegistration`) and on global persistence /
 * events. The three access guards are registered GLOBALLY and default-deny.
 */
@Module({
  imports: [
    DoctorModule, // provides IAuthSubjectStore + IDoctorRegistration
    // Baseline throttler; per-endpoint @Throttle overrides the 'default' one.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
  ],
  controllers: [
    DoctorSignupController,
    DoctorLoginController,
    RefreshSessionController,
    LogoutController,
    MeController,
    VerifyEmailController,
    ResendVerificationController,
    RequestPasswordResetController,
    ResetPasswordController,
    ChangePasswordController,
    SetPasswordController,
    OAuthRedirectController,
    OAuthCallbackController,
    CompleteOAuthSignupController,
    LinkOAuthProviderController,
    UnlinkOAuthProviderController,
  ],
  providers: [
    { provide: IPasswordHasher, useClass: Argon2PasswordHasher },
    { provide: ITokenIssuer, useClass: JwtTokenIssuer },
    AuthKernel,
    OAuthProviderRegistry,
    // Only construct enabled providers — GoogleOAuthProvider reads GOOGLE_* at
    // construction, so it must not be built when OAuth is disabled.
    {
      provide: OAUTH_PROVIDERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IOAuthProvider[] => {
        const providers: IOAuthProvider[] = [];
        if (config.get<boolean>('OAUTH_GOOGLE_ENABLED', false)) {
          providers.push(new GoogleOAuthProvider(config));
        }
        return providers;
      },
    },
    // Resolvable for @UseGuards on the throttled endpoints.
    // EmailIpThrottlerGuard,
    // Global guards, default-deny. Order matters: authn first, then role, then KYC.
    // JwtAuthGuard: authn — required for `@CurrentUser('id')` to resolve on every
    //   non-`@Public()` route. ENABLED. (@Public() keeps login/signup/etc. open.)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // RolesGuard / KycVerifiedGuard: authorization layers, intentionally left off
    // for now — the KYC-doc upload endpoint must be reachable BEFORE a doctor is
    // KYC-verified, so KycVerifiedGuard cannot be global until that endpoint is
    // exempted. Flip on once the verify flow is marked `@Public()`-exempt.
    // { provide: APP_GUARD, useClass: RolesGuard },
    // { provide: APP_GUARD, useClass: KycVerifiedGuard },
  ],
})
export class AuthModule {}
