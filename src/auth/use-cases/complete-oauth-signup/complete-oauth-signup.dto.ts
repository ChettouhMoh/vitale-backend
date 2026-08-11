import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * The provider supplies email/name/picture — never specialty or license. So the
 * completion form collects exactly what only the doctor can provide.
 */
export class CompleteOAuthSignupDto {
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
