import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';

class DevListAttachmentDto {
  @ApiProperty({ example: '019fbaaa-1111-7000-8000-000000000000' })
  id!: string;

  @ApiProperty({ example: 'medical-degree' })
  type!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'doctor-123' })
  ownerId!: string;

  @ApiProperty({ example: 'medical-degree/doctor-123/019fbaaa-...' })
  storageKey!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 1048576 })
  sizeBytes!: number;

  @ApiProperty({ example: 'https://...', nullable: true })
  url!: string | null;

  @ApiProperty({ example: '2026-08-15T10:00:00.000Z' })
  createdAt!: string;
}

/**
 * DEV-ONLY. Returns every attachment row currently in the in-memory store.
 * Returns 404 in production. Visible in Swagger for development tracking.
 */
@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class DevListAttachmentsController {
  constructor(
    @Inject(IAttachmentRepository)
    private readonly repo: IAttachmentRepository,
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
  ) {}

  @Get('_dev/attachments')
  @ApiOperation({
    summary: 'DEV ONLY: List all stored attachments (in-memory store)',
    description:
      'Returns every attachment row in the in-memory repository. Returns 404 in production. Useful for development tracking.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all stored attachments',
    type: DevListAttachmentDto,
    isArray: true,
  })
  @ApiResponse({
    status: 404,
    description: 'Not available in production',
  })
  async list(): Promise<DevListAttachmentDto[]> {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const rows = await this.repo.listAll();

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      ownerId: r.ownerId,
      storageKey: r.storageKey,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      url: r.url,
      createdAt: r.createdAt,
    }));
  }
}
