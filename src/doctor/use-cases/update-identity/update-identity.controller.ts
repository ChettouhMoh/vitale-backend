import { Controller, Patch, Body, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateIdentityDto } from './update-identity.dto';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateIdentityController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Patch('me/identity')
  @ApiOperation({ summary: 'Update name, practice start year, and avatar' })
  @ApiBody({ type: UpdateIdentityDto })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateIdentityDto,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    doctor.updateIdentity(dto.fullName, dto.practiceStartYear ?? null);
    doctor.setAvatar(dto.avatarAttachmentId ?? null);
    await this.doctors.save(doctor);

    return DoctorResponse.from(doctor);
  }
}
