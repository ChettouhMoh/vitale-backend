import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationRoute, MedicationStatus } from '@/patient-record/medication/domain';

export class AddMedicationDto {
  @ApiProperty({ example: 'Lisinopril' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: '10mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dosage!: string;

  @ApiProperty({ example: 'Once daily in the morning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  frequency!: string;

  @ApiProperty({ enum: MedicationRoute, example: MedicationRoute.Oral })
  @IsEnum(MedicationRoute, {
    message: `route must be one of: ${Object.values(MedicationRoute).join(', ')}`,
  })
  route!: MedicationRoute;

  @ApiProperty({ example: '2023-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: MedicationStatus, example: MedicationStatus.Active })
  @IsEnum(MedicationStatus, {
    message: `status must be one of: ${Object.values(MedicationStatus).join(', ')}`,
  })
  status!: MedicationStatus;

  @ApiPropertyOptional({ example: 'Monitor blood pressure regularly' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}
