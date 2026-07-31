import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationRoute, MedicationStatus } from '@/patient-record/medication/domain';

/**
 * Partial update — every field optional. Only the fields present in the body
 * are changed; the rest keep their current value.
 *
 * `name` is intentionally NOT updatable — a medication's name identifies what it
 * is; renaming it is not a valid edit.
 */
export class UpdateMedicationDto {
  @ApiPropertyOptional({ example: '20mg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dosage?: string;

  @ApiPropertyOptional({ example: 'Twice daily' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  frequency?: string;

  @ApiPropertyOptional({ enum: MedicationRoute })
  @IsOptional()
  @IsEnum(MedicationRoute, {
    message: `route must be one of: ${Object.values(MedicationRoute).join(', ')}`,
  })
  route?: MedicationRoute;

  @ApiPropertyOptional({ example: '2023-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-10', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: MedicationStatus })
  @IsOptional()
  @IsEnum(MedicationStatus, {
    message: `status must be one of: ${Object.values(MedicationStatus).join(', ')}`,
  })
  status?: MedicationStatus;

  @ApiPropertyOptional({ example: 'Take with food' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}
