import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Structural validation only — domain rules live elsewhere. */
export class DoctorSignupDto {
  @ApiProperty({ example: 'sarah.ahmed@vitale.dz' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'S3curePass!2345', minLength: 12 })
  @IsString()
  @MinLength(12) // security requirement #9
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Dr. Sarah Ahmed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  specialty!: string;

  @ApiProperty({ example: 'DZ-MED-123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  medicalLicenseNumber!: string;

  @ApiPropertyOptional({ example: '+213555123456' })
  @IsOptional()
  @Matches(/^\+\d{7,15}$/, {
    message: 'phone must be a valid E.164 number e.g. +213555123456',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: ['en', 'fr', 'ar'], example: 'fr' })
  @IsOptional()
  @IsIn(['en', 'fr', 'ar'])
  locale?: string;
}

export class DoctorSignupResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;
}
