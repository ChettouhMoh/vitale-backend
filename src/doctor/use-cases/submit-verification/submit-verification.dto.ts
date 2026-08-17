import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const KYC_ACTIVITY_TYPES = ['public', 'private'] as const;
type KycActivityType = (typeof KYC_ACTIVITY_TYPES)[number];

export class SubmitVerificationDto {
  @ApiPropertyOptional({
    example: '123 Rue Didouche Mourad, Algiers',
    description: 'Written clinic address from the KYC form',
  })
  @IsOptional()
  @IsString()
  clinicAddress?: string;

  @ApiPropertyOptional({
    enum: KYC_ACTIVITY_TYPES,
    example: 'private',
    description: 'Practice activity type from the KYC form',
  })
  @IsOptional()
  @IsEnum(['public', 'private'], {
    message: 'activityType must be either "public" or "private"',
  })
  activityType?: KycActivityType;
}
