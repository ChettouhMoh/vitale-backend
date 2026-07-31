import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VaccineStatus } from '@/patient-record/vaccine/domain';

/**
 * Partial update — every field optional. Only the fields present in the body
 * are changed. `name` is NOT updatable (it identifies the vaccine).
 */
export class UpdateVaccineDto {
  @ApiPropertyOptional({ example: 'Booster' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  dose?: string;

  @ApiPropertyOptional({ enum: VaccineStatus })
  @IsOptional()
  @IsEnum(VaccineStatus, {
    message: `status must be one of: ${Object.values(VaccineStatus).join(', ')}`,
  })
  status?: VaccineStatus;

  @ApiPropertyOptional({ example: '2024-10-05' })
  @IsOptional()
  @IsDateString()
  dateGiven?: string;

  @ApiPropertyOptional({ example: '2025-03-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'General Hospital' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'Seasonal flu shot' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
