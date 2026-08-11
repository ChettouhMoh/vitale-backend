import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DoctorSignupDto, DoctorSignupResponse } from './doctor-signup.dto';
import { Public } from '@/auth/decorators';
import { TokenPurpose } from '@/auth/domain';
import {
  IDoctorRegistration,
  IPasswordHasher,
  ITokenIssuer,
} from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';

const VERIFY_TTL_MS = 7 * 60 * 1000;

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class DoctorSignupController {
  private readonly appUrl: string;

  constructor(
    @Inject(IPasswordHasher) private readonly hasher: IPasswordHasher,
    @Inject(IDoctorRegistration)
    private readonly registration: IDoctorRegistration,
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IEventBus) private readonly events: IEventBus,
    config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  @Post('doctor/signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new doctor with email + password' })
  @ApiResponse({ status: 201, type: DoctorSignupResponse })
  @ApiResponse({ status: 409, description: 'Email or license already registered' })
  async execute(@Body() dto: DoctorSignupDto): Promise<DoctorSignupResponse> {
    const passwordHash = await this.hasher.hash(dto.password);

    // Uniqueness (email + license) is enforced by the doctor persistence layer;
    // no pre-check query. A violation surfaces as EMAIL/LICENSE_ALREADY_REGISTERED.
    const { doctorId } = await this.registration.register({
      email: dto.email,
      passwordHash,
      emailVerified: false, // must click the link before logging in
      fullName: dto.fullName,
      specialty: dto.specialty,
      medicalLicenseNumber: dto.medicalLicenseNumber,
      phone: dto.phone ?? null,
    });

    const token = this.tokens.issue(TokenPurpose.EmailVerify, {
      sub: doctorId,
      email: dto.email,
    });
    const verificationLink = `${this.appUrl}/verify-email/${token}`;
    const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
    const locale = dto.locale ?? 'fr';

    // Two facts: the doctor exists (welcome + any other consumers) and a
    // verification email is requested (carries the real link). Auth gains no
    // mailer dependency — the notification context consumes both.
    await this.events.emit('doctor.registered', {
      doctorId,
      credentialId: doctorId, // no separate credential table; the id IS the credential
      email: dto.email,
      fullName: dto.fullName,
      locale,
    });
    await this.events.emit('auth.email_verification_requested', {
      credentialId: doctorId,
      email: dto.email,
      verificationLink,
      expiresAt,
      locale,
    });

    // No session cookie — the doctor cannot log in until verified.
    return { id: doctorId };
  }
}
