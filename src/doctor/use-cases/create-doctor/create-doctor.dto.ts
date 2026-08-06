import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Signup collects only these fields (matches the signup form). Everything else
 * — license, practice year, avatar, affiliation, profile sections — starts
 * null/empty and is filled in later from the profile.
 */
export class CreateDoctorDto {
  @ApiProperty({ example: 'sarah.ahmed@vitale.dz' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'S3curePass!23' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Dr. Sarah Ahmed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ example: '+213555123456' })
  @IsOptional()
  @Matches(/^\+\d{7,15}$/, {
    message: 'phone must be a valid E.164 number e.g. +213555123456',
  })
  phone?: string;

  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  specialty!: string;
}

export class CreateDoctorResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;
}
