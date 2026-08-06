import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBioDto {
  @ApiPropertyOptional({
    example: 'Board-certified cardiologist…',
    description: 'Free-text bio, or null to clear',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;
}
