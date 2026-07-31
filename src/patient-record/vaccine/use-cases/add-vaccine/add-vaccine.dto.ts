import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VaccineStatus } from '@/patient-record/vaccine/domain';

export class AddVaccineDto {
  @ApiProperty({ example: 'Influenza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'Booster', description: 'e.g. "Dose 1", "Dose 2", "Booster"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  dose!: string;

  @ApiProperty({ enum: VaccineStatus, example: VaccineStatus.Scheduled })
  @IsEnum(VaccineStatus, {
    message: `status must be one of: ${Object.values(VaccineStatus).join(', ')}`,
  })
  status!: VaccineStatus;

  @ApiPropertyOptional({
    example: '2024-10-05',
    description: 'Date administered — only for completed vaccines',
  })
  @IsOptional()
  @IsDateString()
  dateGiven?: string;

  @ApiProperty({ example: '2025-03-01' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 'General Hospital' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location!: string;

  @ApiPropertyOptional({ example: 'Seasonal flu shot' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
