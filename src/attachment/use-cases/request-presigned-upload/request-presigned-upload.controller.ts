import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  RequestPresignedUploadDto,
  RequestPresignedUploadResponse,
} from './request-presigned-upload.dto';
import { Attachment, AttachmentType, UploadStrategy } from '@/attachment/domain';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';
import { LoggerService } from '@/common/logger/logger.service';

const PRESIGN_TTL_SECONDS = 300; // 5 minutes

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class RequestPresignedUploadController {
  constructor(
    @Inject(IAttachmentRepository)
    private readonly repo: IAttachmentRepository,
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
    private readonly logger: LoggerService,
  ) {}

  @Post('presigned')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request a presigned URL for a direct-to-storage upload (large docs)',
  })
  @ApiBody({ type: RequestPresignedUploadDto })
  @ApiResponse({ status: 201, type: RequestPresignedUploadResponse })
  @ApiResponse({
    status: 400,
    description: 'Strategy / MIME / size violation (e.g. presigning an avatar)',
  })
  async execute(
    @Body() dto: RequestPresignedUploadDto,
  ): Promise<RequestPresignedUploadResponse> {
    const type = AttachmentType.create(dto.type);

    // Only presigned-strategy types may be presigned (e.g. you can't presign an avatar).
    type.assertStrategy(UploadStrategy.Presigned);
    // Validate the DECLARED mime + size up front (re-checked for real on confirm).
    type.assertMimeAllowed(dto.mimeType);
    type.assertSizeWithinLimit(dto.sizeBytes);

    const expiresAt = new Date(
      Date.now() + PRESIGN_TTL_SECONDS * 1000,
    ).toISOString();

    // PENDING row — nothing is trusted until confirm verifies the bytes.
    const attachment = Attachment.createPendingForPresign({
      type,
      ownerId: dto.ownerId,
      declaredMime: dto.mimeType,
      declaredSize: dto.sizeBytes,
      expiresAt,
    });

    const presign = await this.storage.createPresignedUpload({
      key: attachment.storageKey,
      mimeType: dto.mimeType,
      maxBytes: type.maxBytes,
      expiresInSeconds: PRESIGN_TTL_SECONDS,
    });

    await this.repo.save(attachment);

    this.logger.info('Presigned upload requested', {
      attachmentId: attachment.id,
      type: attachment.type,
      ownerId: attachment.ownerId,
    });

    return {
      attachmentId: attachment.id,
      uploadUrl: presign.uploadUrl,
      expiresAt: presign.expiresAt,
    };
  }
}
