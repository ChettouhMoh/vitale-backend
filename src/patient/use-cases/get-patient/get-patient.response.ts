import { Patient } from '@/patient/domain/patient';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class EmergencyContactResponse {
  @ApiProperty({ example: 'Ahmed Chettouh' })
  name!: string;

  @ApiProperty({ example: '+213551234567' })
  phone!: string;
}

/**
 * Patient response — mirrors the dashboard's `PatientBasicInfo` shape so the
 * frontend can swap its fake call for this endpoint with no mapping.
 */
export class PatientResponse {
  @ApiProperty({ example: '0198b400-0004-7a04-8b04-0000000c0004' })
  id!: string;

  @ApiProperty({ example: 'Amine Chettouh' })
  name!: string;

  @ApiProperty({ example: '1980-03-15' })
  dateOfBirth!: string;

  @ApiProperty({ example: 'male' })
  gender!: string;

  @ApiProperty({ example: 'O+' })
  bloodType!: string;

  @ApiPropertyOptional({ example: '198003151234567890', nullable: true })
  nationalId?: string | null;

  @ApiPropertyOptional({
    example: 'https://api.dicebear.com/9.x/initials/svg?seed=Amine%20Chettouh',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({ example: ['Peanuts', 'Shellfish'], type: [String] })
  allergies!: string[];

  @ApiProperty({ example: ['Hypertension'], type: [String] })
  chronicDiseases!: string[];

  @ApiPropertyOptional({ type: EmergencyContactResponse, nullable: true })
  emergencyContact?: EmergencyContactResponse | null;

  static from(patient: Patient): PatientResponse {
    const res = new PatientResponse();
    res.id = patient.id;
    res.name = patient.name;
    res.dateOfBirth = patient.dateOfBirth;
    res.gender = patient.gender;
    res.bloodType = patient.bloodType;
    res.nationalId = patient.nationalId;
    res.avatarUrl = patient.avatarUrl;
    res.allergies = patient.allergies;
    res.chronicDiseases = patient.chronicDiseases;
    res.emergencyContact = patient.emergencyContact;
    return res;
  }
}
