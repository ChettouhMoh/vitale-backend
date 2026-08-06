import { Controller, Put, Body, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { UpdateExpertiseDto } from './update-expertise.dto';
import { DoctorExpertise } from '@/doctor/domain';
import { IDoctorExpertiseRepository } from '@/doctor/ports';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

export class ExpertiseResponse {
  @ApiProperty() doctorId!: string;
  @ApiProperty({ type: [String] }) expertise!: string[];
  @ApiProperty() updatedAt!: string;

  static from(e: DoctorExpertise): ExpertiseResponse {
    const r = new ExpertiseResponse();
    r.doctorId = e.doctorId;
    r.expertise = e.expertise;
    r.updatedAt = e.updatedAt.toISOString();
    return r;
  }
}

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateExpertiseController {
  constructor(
    @Inject(IDoctorExpertiseRepository)
    private readonly expertise: IDoctorExpertiseRepository,
  ) {}

  @Put('me/expertise')
  @ApiOperation({ summary: 'Replace the whole expertise list' })
  @ApiBody({ type: UpdateExpertiseDto })
  @ApiResponse({ status: 200, type: ExpertiseResponse })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateExpertiseDto,
  ): Promise<ExpertiseResponse> {
    const doc =
      (await this.expertise.findByDoctorId(doctorId)) ??
      DoctorExpertise.createEmpty(doctorId);
    doc.replace(dto.expertise);
    await this.expertise.save(doc);
    return ExpertiseResponse.from(doc);
  }
}
