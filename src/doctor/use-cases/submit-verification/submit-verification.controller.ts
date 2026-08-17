import {
  Controller,
  Post,
  Inject,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentUser } from '@/auth/decorators';
import { IEventBus } from '@/shared/events/ports';
import { AttachmentTypeValue } from '@/attachment/domain';
import { SubmitVerificationDto } from './submit-verification.dto';
import { LoggerService } from '@/common/logger/logger.service';

const REQUIRED_KYC_TYPES: AttachmentTypeValue[] = [
  AttachmentTypeValue.NationalIdFront,
  AttachmentTypeValue.NationalIdBack,
  AttachmentTypeValue.TenancyAgreement,
  AttachmentTypeValue.MedicalDegree,
  AttachmentTypeValue.EthicsCouncilCertificate,
  AttachmentTypeValue.PracticeLicense,
];

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class SubmitVerificationController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
    @Inject(IAttachmentRepository)
    private readonly attachments: IAttachmentRepository,
    @Inject(IEventBus)
    private readonly events: IEventBus,
    private readonly logger: LoggerService,
  ) {}

  @Post('me/verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit KYC for verification (→ pending)' })
  @ApiBody({ type: SubmitVerificationDto })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({
    status: 409,
    description: 'Not in a submittable state (already pending/verified)',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required KYC documents',
  })
  async execute(
    @CurrentUser('id') doctorId: string,
    @Body() dto: SubmitVerificationDto,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (doctor.verificationStatus === 'verified') {
      throw new DomainError(
        DoctorErrorCode.ALREADY_VERIFIED,
        'This account is already approved — no further KYC submission is needed',
        HttpStatus.CONFLICT,
      );
    }

    if (
      doctor.verificationStatus !== 'unverified' &&
      doctor.verificationStatus !== 'rejected'
    ) {
      throw new DomainError(
        DoctorErrorCode.INVALID_VERIFICATION_TRANSITION,
        `Cannot submit verification from status ${doctor.verificationStatus}`,
        HttpStatus.CONFLICT,
      );
    }

    const allAttachments = await this.attachments.findActiveByOwner(
      doctorId,
      'kyc_attachments',
    );
    const submittedTypes = new Set(
      allAttachments
        .filter((a) =>
          REQUIRED_KYC_TYPES.includes(a.type as AttachmentTypeValue),
        )
        .map((a) => a.type),
    );
    const missing = REQUIRED_KYC_TYPES.filter((t) => !submittedTypes.has(t));

    if (missing.length > 0) {
      throw new DomainError(
        DoctorErrorCode.VERIFICATION_DOCUMENTS_MISSING,
        `Missing KYC documents: ${missing.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.clinicAddress || dto.activityType) {
      doctor.updateKycProfile(
        dto.clinicAddress ?? null,
        dto.activityType ?? null,
      );
    }

    doctor.submitForVerification();
    await this.doctors.save(doctor);

    const kycAttachmentIds = allAttachments.map((a) => a.id);

    await this.events.emit('doctor.kyc_submitted', {
      doctorId,
      attachmentIds: kycAttachmentIds,
    });

    this.logger.info(`KYC submitted for doctor: ${doctorId}`);

    return DoctorResponse.from(doctor);
  }
}
