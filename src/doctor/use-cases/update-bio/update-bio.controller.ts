import { Controller, Patch, Body, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { UpdateBioDto } from './update-bio.dto';
import { DoctorBio } from '@/doctor/domain';
import { IDoctorBioRepository } from '@/doctor/ports';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

export class BioResponse {
  @ApiProperty() doctorId!: string;
  @ApiPropertyOptional({ nullable: true }) bio!: string | null;
  @ApiProperty() updatedAt!: string;

  static from(b: DoctorBio): BioResponse {
    const r = new BioResponse();
    r.doctorId = b.doctorId;
    r.bio = b.bio;
    r.updatedAt = b.updatedAt.toISOString();
    return r;
  }
}

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateBioController {
  constructor(
    @Inject(IDoctorBioRepository)
    private readonly bios: IDoctorBioRepository,
  ) {}

  @Patch('me/bio')
  @ApiOperation({ summary: 'Update the profile bio' })
  @ApiBody({ type: UpdateBioDto })
  @ApiResponse({ status: 200, type: BioResponse })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateBioDto,
  ): Promise<BioResponse> {
    // Load-or-empty: the section document is created lazily on first write.
    const bio =
      (await this.bios.findByDoctorId(doctorId)) ??
      DoctorBio.createEmpty(doctorId);
    bio.update(dto.bio ?? null);
    await this.bios.save(bio);
    return BioResponse.from(bio);
  }
}
