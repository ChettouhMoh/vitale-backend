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
  IsNotEmptyObject,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodTypeValue } from '@/patient/domain';

export class EmergencyContactDto {
  @ApiProperty({ example: 'Ahmed Bensalem' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  /**
   * Pre-merged E.164 phone number sent by the frontend.
   * The mobile app combines the country code selector + local number
   * before sending — no backend splitting needed.
   */
  @ApiProperty({ example: '+213555123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{7,15}$/, {
    message: 'phone must be a valid E.164 number e.g. +213555123456',
  })
  phone!: string;
}

export class CreatePatientDto {
  @ApiProperty({ example: 'Amira Boudiaf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: '1990-04-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'female', enum: ['male', 'female'] })
  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ApiProperty({ enum: BloodTypeValue, example: BloodTypeValue.APositive })
  @IsEnum(BloodTypeValue, {
    message: `bloodType must be one of: ${Object.values(BloodTypeValue).join(', ')}`,
  })
  bloodType!: BloodTypeValue;

  @ApiPropertyOptional({
    example: '123456789012345678',
    description: '18-digit Algerian NIN — optional, can be added later',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{18}$/, {
    message: 'nationalIdNumber must be exactly 18 digits',
  })
  nationalIdNumber?: string;

  @ApiPropertyOptional({ example: 'https://cdn.vitale.dz/avatars/abc.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: ['Penicillin', 'Pollen'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  allergies?: string[];

  @ApiPropertyOptional({ example: ['Type 2 Diabetes'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(150, { each: true })
  chronicDiseases?: string[];

  @ApiProperty({ type: EmergencyContactDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact!: EmergencyContactDto;
}
