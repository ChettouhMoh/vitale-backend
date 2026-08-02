import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentTypeValue } from '@/attachment/domain';

export class UploadAttachmentDto {
  @ApiProperty({ enum: AttachmentTypeValue, example: AttachmentTypeValue.Avatar })
  @IsEnum(AttachmentTypeValue, {
    message: `type must be one of: ${Object.values(AttachmentTypeValue).join(', ')}`,
  })
  type!: AttachmentTypeValue;

  // Owner (doctor) id — will come from the auth context once auth is wired.
  @ApiProperty({ example: 'doctor-123' })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}

export class UploadAttachmentResponse {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({ enum: AttachmentTypeValue })
  type!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({
    example: 'http://localhost:3000/files/avatar/doctor-123/019fbaaa…',
    nullable: true,
  })
  url!: string | null;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ example: 20481 })
  sizeBytes!: number;

  @ApiPropertyOptional({ example: 'e3b0c44298fc1c149afbf4c8996fb924…', nullable: true })
  sha256Digest!: string | null;
}
