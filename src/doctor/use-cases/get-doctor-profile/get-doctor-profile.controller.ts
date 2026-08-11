import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DoctorProfileResponse } from './doctor-profile.response';
import {
  DoctorBio,
  DoctorEducation,
  DoctorExpertise,
  DoctorLanguages,
  DoctorSchedule,
} from '@/doctor/domain';
import {
  IDoctorBioRepository,
  IDoctorExpertiseRepository,
  IDoctorLanguagesRepository,
  IDoctorEducationRepository,
  IDoctorScheduleRepository,
} from '@/doctor/ports';
import { CurrentUser } from '@/auth/decorators';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class GetDoctorProfileController {
  constructor(
    @Inject(IDoctorBioRepository)
    private readonly bios: IDoctorBioRepository,
    @Inject(IDoctorExpertiseRepository)
    private readonly expertise: IDoctorExpertiseRepository,
    @Inject(IDoctorLanguagesRepository)
    private readonly languages: IDoctorLanguagesRepository,
    @Inject(IDoctorEducationRepository)
    private readonly education: IDoctorEducationRepository,
    @Inject(IDoctorScheduleRepository)
    private readonly schedule: IDoctorScheduleRepository,
  ) {}

  @Get('me/profile')
  @ApiOperation({
    summary: "Get the doctor's extended profile (assembled from its sections)",
  })
  @ApiResponse({ status: 200, type: DoctorProfileResponse })
  async execute(
    @CurrentUser('id') doctorId: string,
  ): Promise<DoctorProfileResponse> {
    // Each section is its own document; a missing one defaults to empty so the
    // lazy-load endpoint never 404s.
    const [bio, expertise, languages, education, schedule] = await Promise.all([
      this.bios.findByDoctorId(doctorId),
      this.expertise.findByDoctorId(doctorId),
      this.languages.findByDoctorId(doctorId),
      this.education.findByDoctorId(doctorId),
      this.schedule.findByDoctorId(doctorId),
    ]);

    return DoctorProfileResponse.from({
      doctorId,
      bio: bio ?? DoctorBio.createEmpty(doctorId),
      expertise: expertise ?? DoctorExpertise.createEmpty(doctorId),
      languages: languages ?? DoctorLanguages.createEmpty(doctorId),
      education: education ?? DoctorEducation.createEmpty(doctorId),
      schedule: schedule ?? DoctorSchedule.createEmpty(doctorId),
    });
  }
}
