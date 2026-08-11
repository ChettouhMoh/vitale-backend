import { Controller, Patch, Body, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateContactDto } from './update-contact.dto';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentUser } from '@/auth/decorators';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateContactController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Patch('me/contact')
  @ApiOperation({ summary: 'Update phone (email change is a separate flow)' })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async execute(
    @CurrentUser('id') doctorId: string,
    @Body() dto: UpdateContactDto,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    doctor.updateContact(dto.phone ?? null);
    await this.doctors.save(doctor);

    return DoctorResponse.from(doctor);
  }
}
