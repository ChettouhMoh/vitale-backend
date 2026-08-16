import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DoctorLoginDto {
  @ApiProperty({ example: 'mohchettouh80@gmail.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // No min-length here on purpose: enforcing password rules on LOGIN would leak
  // policy and reject legacy passwords. Any non-empty string is accepted and
  // checked against the stored hash.
  @ApiProperty({ example: 'VitaleDemo123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class AuthPrincipalResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({ example: 'doctor' })
  role!: string;

  @ApiProperty({ example: 'sarah.ahmed@vitale.dz' })
  email!: string;

  @ApiProperty({ example: 'verified' })
  kycStatus!: string;
}
