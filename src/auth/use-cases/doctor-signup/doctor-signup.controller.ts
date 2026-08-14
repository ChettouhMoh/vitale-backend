import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UploadAttachmentService } from '@/attachment/use-cases/upload-attachment/upload-attachment.service';
import {
  DoctorSignupDto,
  DoctorSignupResponse,
  SignupAvatarResult,
} from './doctor-signup.dto';
import { Public } from '@/auth/decorators';
import { TokenPurpose } from '@/auth/domain';
import {
  IDoctorRegistration,
  IPasswordHasher,
  ITokenIssuer,
} from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';

/** Minimal multer memory-storage file shape (avoids needing @types/multer). */
interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

const VERIFY_TTL_MS = 7 * 60 * 1000;
// Avatar ceiling (mirrors the attachment-type rule for avatars).
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Registration + optional avatar in ONE multipart request — the 2-step UX collects
 * the values client-side, but submits them together so the doctor can be created
 * and the avatar attached server-side with a real owner-id (doctorId), avoiding
 * the token-during-signup problem: there's no JWT yet, so the avatar is uploaded
 * internally via UploadAttachmentService (no @CurrentUser needed).
 */
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
    private readonly attachment: UploadAttachmentService,
    config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  @Post('doctor/signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new doctor (account + optional avatar photo)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'email',
        'password',
        'fullName',
        'specialty',
        'medicalLicenseNumber',
      ],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password' },
        fullName: { type: 'string' },
        specialty: { type: 'string' },
        medicalLicenseNumber: { type: 'string' },
        phone: { type: 'string', nullable: true },
        locale: { type: 'string' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, type: DoctorSignupResponse })
  @ApiResponse({
    status: 409,
    description: 'Email or license already registered',
  })
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: MAX_AVATAR_BYTES } }),
  )
  async execute(
    @Body() dto: DoctorSignupDto,
    @UploadedFile() avatar: UploadedFileLike | undefined,
  ): Promise<DoctorSignupResponse> {
    // Uniqueness (email + license) is enforced by the doctor persistence layer;
    // no pre-check query. A violation surfaces as EMAIL/LICENSE_ALREADY_REGISTERED.
    const passwordHash = await this.hasher.hash(dto.password);
    const { doctorId } = await this.registration.register({
      email: dto.email,
      passwordHash,
      emailVerified: false, // must click the link before logging in
      fullName: dto.fullName,
      specialty: dto.specialty,
      medicalLicenseNumber: dto.medicalLicenseNumber,
      phone: dto.phone ?? null,
    });

    // Optional avatar: upload + link in the same transaction boundary using the
    // just-created doctorId as ownerId. No session/token required.
    let avatarResult: SignupAvatarResult | undefined;
    if (avatar?.buffer) {
      const uploaded = await this.attachment.uploadAvatar(avatar, doctorId);
      await this.registration.attachAvatar(doctorId, uploaded.id);
      avatarResult = { id: uploaded.id, url: uploaded.url ?? '' };
    }

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
      credentialId: doctorId,
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
    return { id: doctorId, avatar: avatarResult };
  }
}
