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
  @ApiProperty({ example: 'abdouchettouh80@gmail.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '123456789123', minLength: 12 })
  @IsString()
  @MinLength(12) // security requirement #9
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Mohamed Chettouh' })
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

export class SignupAvatarResult {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({
    example: 'https://cdn.vitale.dz/avatar/doctor-123/019fbaaa-….webp',
  })
  url!: string;
}

export class DoctorSignupResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;

  @ApiPropertyOptional({
    description: 'Present only when an avatar was uploaded during signup',
    type: SignupAvatarResult,
  })
  avatar?: SignupAvatarResult;
}
