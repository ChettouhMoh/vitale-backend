import { Controller, Put, Body, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { UpdateEducationDto } from './update-education.dto';
import { DoctorEducation } from '@/doctor/domain';
import { IDoctorEducationRepository } from '@/doctor/ports';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

class EducationEntryOut {
  @ApiProperty() degree!: string;
  @ApiProperty() institution!: string;
  @ApiProperty() year!: string;
}

export class EducationResponse {
  @ApiProperty() doctorId!: string;
  @ApiProperty({ type: [EducationEntryOut] }) education!: EducationEntryOut[];
  @ApiProperty() updatedAt!: string;

  static from(e: DoctorEducation): EducationResponse {
    const r = new EducationResponse();
    r.doctorId = e.doctorId;
    r.education = e.education;
    r.updatedAt = e.updatedAt.toISOString();
    return r;
  }
}

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateEducationController {
  constructor(
    @Inject(IDoctorEducationRepository)
    private readonly education: IDoctorEducationRepository,
  ) {}

  @Put('me/education')
  @ApiOperation({ summary: 'Replace the whole education history' })
  @ApiBody({ type: UpdateEducationDto })
  @ApiResponse({ status: 200, type: EducationResponse })
  @ApiResponse({ status: 400, description: 'Invalid education year (future)' })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateEducationDto,
  ): Promise<EducationResponse> {
    const doc =
      (await this.education.findByDoctorId(doctorId)) ??
      DoctorEducation.createEmpty(doctorId);
    doc.replace(dto.education);
    await this.education.save(doc);
    return EducationResponse.from(doc);
  }
}
