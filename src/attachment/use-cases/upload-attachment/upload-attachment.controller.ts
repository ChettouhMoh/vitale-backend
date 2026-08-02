import {
  Controller,
  Post,
  Body,
  Inject,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createHash } from 'node:crypto';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import {
  UploadAttachmentDto,
  UploadAttachmentResponse,
} from './upload-attachment.dto';
import {
  Attachment,
  AttachmentType,
  AttachmentTypeValue,
  UploadStrategy,
  detectMimeFromBytes,
} from '@/attachment/domain';
import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';
import { LoggerService } from '@/common/logger/logger.service';

/** Minimal shape of a multer memory-storage file (avoids needing @types/multer). */
interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

// Hard ceiling to bound request memory; finer per-type limits live in the domain.
const MAX_PROXY_BYTES = 25 * 1024 * 1024;

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class UploadAttachmentController {
  constructor(
    @Inject(IAttachmentRepository)
    private readonly repo: IAttachmentRepository,
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
    private readonly logger: LoggerService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a small attachment through the backend proxy',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type', 'ownerId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: Object.values(AttachmentTypeValue) },
        ownerId: { type: 'string', example: 'doctor-123' },
      },
    },
  })
  @ApiResponse({ status: 201, type: UploadAttachmentResponse })
  @ApiResponse({
    status: 400,
    description: 'Strategy / MIME / size / magic-byte violation',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PROXY_BYTES },
    }),
  )
  async execute(
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body() dto: UploadAttachmentDto,
  ): Promise<UploadAttachmentResponse> {
    if (!file) throw new BadRequestException('file is required');

    const type = AttachmentType.create(dto.type);
    const sizeBytes = file.buffer.length;

    // 1. This type must use the proxy strategy (can't proxy a presigned-only doc).
    type.assertStrategy(UploadStrategy.Proxy);
    // 2. Size within the per-type limit.
    type.assertSizeWithinLimit(sizeBytes);
    // 3. Sniff the ACTUAL bytes — the real defense against Content-Type spoofing.
    const sniffed = detectMimeFromBytes(file.buffer);
    if (!sniffed) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_FILE,
        'Unrecognized file content (magic bytes did not match a supported type)',
      );
    }
    // 4. The client's declared Content-Type must match the real bytes.
    if (file.mimetype !== sniffed) {
      throw new DomainError(
        AttachmentErrorCode.MIME_MISMATCH,
        `Declared "${file.mimetype}" but the bytes are "${sniffed}"`,
      );
    }
    // 5. …and that real type must be allowed for this attachment type.
    type.assertMimeAllowed(sniffed);

    const sha256Digest = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Build the aggregate (born ACTIVE), store the bytes, then link the URL.
    const attachment = Attachment.createActiveFromUpload({
      type,
      ownerId: dto.ownerId,
      mimeType: sniffed,
      sizeBytes,
      sha256Digest,
    });

    const { url } = await this.storage.upload({
      key: attachment.storageKey,
      buffer: file.buffer,
      mimeType: sniffed,
    });
    attachment.linkUploadedUrl(url);

    await this.repo.save(attachment);

    this.logger.info('Attachment uploaded (proxy)', {
      attachmentId: attachment.id,
      type: attachment.type,
      ownerId: attachment.ownerId,
    });

    return {
      id: attachment.id,
      type: attachment.type,
      status: attachment.status,
      url: attachment.url,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      sha256Digest: attachment.sha256Digest,
    };
  }
}
