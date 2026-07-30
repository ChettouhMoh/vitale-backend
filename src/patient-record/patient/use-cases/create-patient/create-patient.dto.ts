import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUrl,
  IsArray,
  IsEnum,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodTypeValue, Gender } from '@/patient-record/patient/domain';

export class EmergencyContactDto {
  @ApiProperty({ example: 'Ahmed Chettouh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * Pre-merged E.164 phone number sent by the frontend (country code + local
   * number already combined — no backend splitting needed).
   */
  @ApiProperty({ example: '+213551234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{7,15}$/, {
    message: 'phone must be a valid E.164 number e.g. +213551234567',
  })
  phone!: string;
}

export class CreatePatientDto {
  @ApiProperty({ example: 'Soulaf Ayad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '2013-09-05' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Gender, example: Gender.Female })
  @IsEnum(Gender, {
    message: `gender must be one of: ${Object.values(Gender).join(', ')}`,
  })
  gender!: Gender;

  @ApiProperty({ enum: BloodTypeValue, example: BloodTypeValue.APositive })
  @IsEnum(BloodTypeValue, {
    message: `bloodType must be one of: ${Object.values(BloodTypeValue).join(', ')}`,
  })
  bloodType!: BloodTypeValue;

  @ApiPropertyOptional({
    example: '201309054321098765',
    description: '18-digit national ID — optional, can be added later',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{18}$/, { message: 'nationalId must be exactly 18 digits' })
  nationalId?: string;

  @ApiPropertyOptional({
    example: 'https://api.dicebear.com/9.x/initials/svg?seed=Soulaf%20Ayad',
    description: 'Optional — a default DiceBear avatar is generated when omitted',
  })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: ['Penicillin'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  allergies?: string[];

  @ApiPropertyOptional({ example: ['Asthma'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(150, { each: true })
  chronicDiseases?: string[];

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}
