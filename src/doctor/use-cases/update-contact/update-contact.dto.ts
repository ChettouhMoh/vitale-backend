import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContactDto {
  @ApiPropertyOptional({
    example: '+213555123456',
    description: 'E.164 phone, or null to clear',
    nullable: true,
  })
  @IsOptional()
  @Matches(/^\+\d{7,15}$/, {
    message: 'phone must be a valid E.164 number e.g. +213555123456',
  })
  phone?: string | null;
}
