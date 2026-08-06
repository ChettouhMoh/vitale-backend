import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCredentialsDto {
  @ApiProperty({ example: 'Interventional Cardiology' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  specialty!: string;

  @ApiPropertyOptional({
    example: 'MD123456',
    description: 'Added on the profile after signup; null to clear',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicalLicenseNumber?: string | null;
}
