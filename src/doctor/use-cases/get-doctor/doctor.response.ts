import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Doctor, VerificationStatusValue } from '@/doctor/domain';

class AffiliationResponse {
  @ApiPropertyOptional({ example: 'CHU Mustapha Pacha', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'public_hospital' })
  type!: string;

  @ApiPropertyOptional({ example: 'Cardiology', nullable: true })
  department!: string | null;
}

export class DoctorResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({ example: 'sarah.ahmed@vitale.dz' })
  email!: string;

  @ApiProperty({ example: 'Dr. Sarah Ahmed' })
  fullName!: string;

  @ApiPropertyOptional({ example: '+213555123456', nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarAttachmentId!: string | null;

  @ApiProperty({ example: 'Cardiology' })
  specialty!: string;

  @ApiPropertyOptional({ example: 'MD123456', nullable: true })
  medicalLicenseNumber!: string | null;

  @ApiPropertyOptional({ example: 2017, nullable: true })
  practiceStartYear!: number | null;

  @ApiProperty({ type: AffiliationResponse })
  affiliation!: AffiliationResponse;

  @ApiProperty({ example: 'pending' })
  accountStatus!: string;

  @ApiProperty({ example: 'unverified' })
  verificationStatus!: string;

  @ApiPropertyOptional({
    description: 'Present only when verificationStatus is "rejected"',
    nullable: true,
  })
  verificationRejectionReason?: string | null;

  @ApiPropertyOptional({
    description: 'Admin id who verified/rejected (null until decided)',
    nullable: true,
  })
  verifiedBy!: string | null;

  @ApiProperty({ example: '2026-08-02T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-02T10:00:00.000Z' })
  updatedAt!: string;

  static from(doctor: Doctor): DoctorResponse {
    const res = new DoctorResponse();
    res.id = doctor.id;
    res.email = doctor.email;
    res.fullName = doctor.fullName;
    res.phone = doctor.phone;
    res.avatarAttachmentId = doctor.avatarAttachmentId;
    res.specialty = doctor.specialty;
    res.medicalLicenseNumber = doctor.medicalLicenseNumber;
    res.practiceStartYear = doctor.practiceStartYear;
    res.affiliation = {
      name: doctor.affiliationName,
      type: doctor.affiliationType,
      department: doctor.affiliationDepartment,
    };
    res.accountStatus = doctor.accountStatus;
    res.verificationStatus = doctor.verificationStatus;
    // Surface the reason only when actually rejected.
    if (doctor.verificationStatus === VerificationStatusValue.Rejected) {
      res.verificationRejectionReason = doctor.verificationRejectionReason;
    }
    res.verifiedBy = doctor.verifiedBy;
    res.createdAt = doctor.createdAt.toISOString();
    res.updatedAt = doctor.updatedAt.toISOString();
    return res;
  }
}
