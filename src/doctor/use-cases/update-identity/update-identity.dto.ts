import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CURRENT_YEAR = new Date().getFullYear();

export class UpdateIdentityDto {
  @ApiProperty({ example: 'Dr. Sarah Ahmed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({
    example: 2017,
    description: 'Year practice began (not a computed experience count)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  practiceStartYear?: number | null;

  @ApiPropertyOptional({
    description: 'Attachment id of the avatar (from the attachment module)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatarAttachmentId?: string | null;
}
