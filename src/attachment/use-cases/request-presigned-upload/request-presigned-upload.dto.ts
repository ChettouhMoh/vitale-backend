import { IsString, IsNotEmpty, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AttachmentTypeValue } from '@/attachment/domain';

export class RequestPresignedUploadDto {
  @ApiProperty({
    enum: AttachmentTypeValue,
    example: AttachmentTypeValue.MedicalDegree,
  })
  @IsEnum(AttachmentTypeValue, {
    message: `type must be one of: ${Object.values(AttachmentTypeValue).join(', ')}`,
  })
  type!: AttachmentTypeValue;

  @ApiProperty({
    example: 'application/pdf',
    description: 'Declared MIME of the file to upload',
  })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 1048576, description: 'Declared size in bytes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

export class RequestPresignedUploadResponse {
  @ApiProperty({ example: '019fbaaa-2222-7000-8000-000000000000' })
  attachmentId!: string;

  @ApiProperty({
    example: 'http://localhost:3000/v1/attachments/_dev/presigned/2b1e…',
    description: 'PUT the raw bytes here, then call confirm',
  })
  uploadUrl!: string;

  @ApiProperty({ example: '2026-08-02T10:05:00.000Z' })
  expiresAt!: string;
}
