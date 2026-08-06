import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DoctorBio,
  DoctorEducation,
  DoctorExpertise,
  DoctorLanguages,
  DoctorSchedule,
} from '@/doctor/domain';

class EducationEntryResponse {
  @ApiProperty({ example: 'MD, Medicine' }) degree!: string;
  @ApiProperty({ example: 'Faculty of Medicine, Algiers' }) institution!: string;
  @ApiProperty({ example: '2017' }) year!: string;
}

class ScheduleDayResponse {
  @ApiProperty({ example: 'mon' }) dayKey!: string;
  @ApiProperty({ example: true }) active!: boolean;
  @ApiProperty({ example: '09:00' }) startTime!: string;
  @ApiProperty({ example: '17:00' }) endTime!: string;
  @ApiProperty({ example: 'working' }) status!: string;
}

/**
 * Assembled from the five per-section documents. `updatedAt` is the most recent
 * section update.
 */
export class DoctorProfileResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  doctorId!: string;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;

  @ApiProperty({ type: [String], example: ['Interventional Cardiology'] })
  expertise!: string[];

  @ApiProperty({ type: [String], example: ['English', 'French', 'Arabic'] })
  languages!: string[];

  @ApiProperty({ type: [EducationEntryResponse] })
  education!: EducationEntryResponse[];

  @ApiProperty({ type: [ScheduleDayResponse] })
  schedule!: ScheduleDayResponse[];

  @ApiProperty({ example: '2026-08-02T10:00:00.000Z' })
  updatedAt!: string;

  static from(parts: {
    doctorId: string;
    bio: DoctorBio;
    expertise: DoctorExpertise;
    languages: DoctorLanguages;
    education: DoctorEducation;
    schedule: DoctorSchedule;
  }): DoctorProfileResponse {
    const res = new DoctorProfileResponse();
    res.doctorId = parts.doctorId;
    res.bio = parts.bio.bio;
    res.expertise = parts.expertise.expertise;
    res.languages = parts.languages.languages;
    res.education = parts.education.education;
    res.schedule = parts.schedule.schedule;
    const latest = Math.max(
      parts.bio.updatedAt.getTime(),
      parts.expertise.updatedAt.getTime(),
      parts.languages.updatedAt.getTime(),
      parts.education.updatedAt.getTime(),
      parts.schedule.updatedAt.getTime(),
    );
    res.updatedAt = new Date(latest).toISOString();
    return res;
  }
}
