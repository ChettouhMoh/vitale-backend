import { Patient } from '@/patient/domain/patient';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class EmergencyContactResponse {
  @ApiProperty({ example: 'Ahmed Bensalem' })
  name!: string;

  @ApiProperty({ example: '+213555123456' })
  phone!: string;
}

export class PatientResponse {
  @ApiProperty({ example: '01932b3a-7c1d-7000-8000-123456789abc' })
  id!: string;

  @ApiProperty({ example: 'Amira Boudiaf' })
  fullName!: string;

  @ApiProperty({ example: '1990-04-15T00:00:00.000Z' })
  dateOfBirth!: string;

  @ApiProperty({ example: 'female' })
  gender!: string;

  @ApiProperty({ example: 'A+' })
  bloodType!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.vitale.dz/avatars/abc.jpg',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({ example: ['Penicillin'], type: [String] })
  allergies!: string[];

  @ApiProperty({ example: ['Type 2 Diabetes'], type: [String] })
  chronicDiseases!: string[];

  @ApiProperty({ type: EmergencyContactResponse })
  emergencyContact!: EmergencyContactResponse;

  @ApiProperty({ example: '2026-06-22T10:00:00.000Z' })
  createdAt!: string;

  // NIN is intentionally excluded from the API response —
  // it is sensitive PII and not needed by any consumer of this endpoint.

  static from(patient: Patient): PatientResponse {
    const res = new PatientResponse();
    res.id = patient.id;
    res.fullName = patient.fullName;
    res.dateOfBirth = patient.dateOfBirth.toISOString();
    res.gender = patient.gender;
    res.bloodType = patient.bloodType;
    res.avatarUrl = patient.avatarUrl;
    res.allergies = patient.allergies;
    res.chronicDiseases = patient.chronicDiseases;
    res.emergencyContact = {
      name: patient.emergencyContactName,
      phone: patient.emergencyContactPhone,
    };
    res.createdAt = patient.createdAt.toISOString();
    return res;
  }
}
