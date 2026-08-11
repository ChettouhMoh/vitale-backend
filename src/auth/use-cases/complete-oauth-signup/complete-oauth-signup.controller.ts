import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CompleteOAuthSignupDto } from './complete-oauth-signup.dto';
import { AuthPrincipalResponse } from '../doctor-login';
import { Public } from '@/auth/decorators';
import { AuthErrorCode, TokenPurpose } from '@/auth/domain';
import {
  IDoctorOAuthLinkRepository,
  IDoctorRegistration,
  ITokenIssuer,
} from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';
import { AuthKernel } from '@/auth/kernel';
import { DomainError } from '@/common/errors/domain.error';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class CompleteOAuthSignupController {
  constructor(
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IDoctorRegistration)
    private readonly registration: IDoctorRegistration,
    @Inject(IDoctorOAuthLinkRepository)
    private readonly oauthLinks: IDoctorOAuthLinkRepository,
    @Inject(IEventBus) private readonly events: IEventBus,
    private readonly kernel: AuthKernel,
  ) {}

  @Post('oauth/complete')
  // @Public: authorized by the registration TICKET cookie, not a session — no
  // doctor row and no `@CurrentUser()` exist yet. This is a creation endpoint.
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Finish OAuth signup with specialty + license' })
  @ApiResponse({ status: 201, type: AuthPrincipalResponse })
  @ApiResponse({ status: 401, description: 'Registration ticket missing/invalid/expired' })
  async execute(
    @Body() dto: CompleteOAuthSignupDto,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthPrincipalResponse> {
    const raw = this.kernel.readTicketCookie(req.cookies);
    if (!raw) {
      throw new DomainError(
        AuthErrorCode.REGISTRATION_TICKET_INVALID,
        'Registration ticket is missing',
        401,
      );
    }
    const claims = this.tokens.verify(TokenPurpose.OAuthTicket, raw);
    const email = claims.email as string;
    const provider = claims.provider as string;
    const providerUserId = claims.providerUserId as string;

    // No invalid doctor row is ever written: creation happens here, with the
    // doctor-supplied fields, in one shot — never a placeholder created earlier.
    const { doctorId } = await this.registration.register({
      email,
      passwordHash: null, // OAuth-only
      emailVerified: true, // the provider proved it
      fullName: dto.fullName,
      specialty: dto.specialty,
      medicalLicenseNumber: dto.medicalLicenseNumber,
      phone: dto.phone ?? null,
    });
    await this.oauthLinks.link(doctorId, provider, providerUserId);

    await this.events.emit('doctor.registered', {
      doctorId,
      credentialId: doctorId,
      email,
      fullName: dto.fullName,
      locale: dto.locale ?? 'fr',
    });

    // No verification email — already verified. Log the doctor straight in.
    this.kernel.clearTicketCookie(res);
    const principal = await this.kernel.issueSessionById(res, doctorId);
    return {
      id: principal.id,
      role: principal.role,
      email: principal.email,
      kycStatus: principal.kycStatus,
    };
  }
}
