import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VERIFICATION_DECISIONS = ['verified', 'rejected'] as const;
export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

export class DecideVerificationDto {
  @ApiProperty({ enum: VERIFICATION_DECISIONS, example: 'verified' })
  @IsIn(VERIFICATION_DECISIONS, {
    message: `decision must be one of: ${VERIFICATION_DECISIONS.join(', ')}`,
  })
  decision!: VerificationDecision;

  @ApiPropertyOptional({
    example: 'Uploaded license is illegible',
    description: 'Required when decision is "rejected"; null/omitted for "verified"',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
