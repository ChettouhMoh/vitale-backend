import { Controller, Post, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentUser } from '@/auth/decorators';
import { IEventBus } from '@/shared/events/ports';
import { AttachmentTypeValue } from '@/attachment/domain';

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
  ) {}

  @Post('me/verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit KYC for verification (→ pending)' })
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
  async execute(@CurrentUser('id') doctorId: string): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const allAttachments = await this.attachments.findActiveByOwner(
      doctorId,
      'kyc',
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

    doctor.submitForVerification();
    await this.doctors.save(doctor);

    const kycAttachmentIds = allAttachments
      .filter((a) => REQUIRED_KYC_TYPES.includes(a.type as AttachmentTypeValue))
      .map((a) => a.id);

    await this.events.emit('doctor.kyc.submitted', {
      doctorId,
      attachmentIds: kycAttachmentIds,
    });

    return DoctorResponse.from(doctor);
  }
}
