import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkplaceType } from '@/doctor/domain';

export class UpdateAffiliationDto {
  @ApiPropertyOptional({
    example: 'CHU Mustapha Pacha',
    description: 'Must be null for an independent practitioner',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workplaceName?: string | null;

  @ApiProperty({ enum: WorkplaceType, example: WorkplaceType.PublicHospital })
  @IsEnum(WorkplaceType, {
    message: `workplaceType must be one of: ${Object.values(WorkplaceType).join(', ')}`,
  })
  workplaceType!: WorkplaceType;

  @ApiPropertyOptional({
    example: 'Cardiology',
    description: 'Only valid for hospitals',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  department?: string | null;
}
