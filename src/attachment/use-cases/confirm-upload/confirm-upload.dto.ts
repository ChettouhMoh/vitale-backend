import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmUploadResponse {
  @ApiProperty({ example: '019fbaaa-2222-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({
    example: 'http://localhost:3000/files/medical-degree/…',
    nullable: true,
  })
  url!: string | null;

  @ApiPropertyOptional({
    example: 'e3b0c44298fc1c149afbf4c8996fb924…',
    nullable: true,
  })
  sha256Digest!: string | null;
}
