import {
  Controller,
  Post,
  Param,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ConfirmUploadDto, ConfirmUploadResponse } from './confirm-upload.dto';
import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class ConfirmUploadController {
  constructor(
    @Inject(IAttachmentRepository)
    private readonly repo: IAttachmentRepository,
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
    private readonly logger: LoggerService,
  ) {}

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm a presigned upload — verifies the object before activating',
  })
  @ApiParam({ name: 'id', description: 'Attachment id' })
  @ApiBody({ type: ConfirmUploadDto })
  @ApiResponse({ status: 200, type: ConfirmUploadResponse })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({
    status: 409,
    description: 'Object not in storage, or not in a confirmable state',
  })
  async execute(
    @Param('id') id: string,
    @Body() dto: ConfirmUploadDto,
  ): Promise<ConfirmUploadResponse> {
    const attachment = await this.repo.findById(id);
    if (!attachment) {
      throw new DomainError(
        AttachmentErrorCode.ATTACHMENT_NOT_FOUND,
        `Attachment ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    attachment.assertOwnedBy(dto.ownerId);

    // NEVER trust the client's "I uploaded it" — check the store itself.
    const info = await this.storage.verifyExists(attachment.storageKey);
    if (!info) {
      throw new DomainError(
        AttachmentErrorCode.UPLOAD_NOT_FOUND_IN_STORAGE,
        'No object found in storage for this attachment — upload not completed',
        HttpStatus.CONFLICT,
      );
    }

    // Promote to ACTIVE, re-validating the REAL size + mime from storage.
    attachment.confirm({
      sha256Digest: info.sha256Digest,
      sizeBytes: info.sizeBytes,
      mimeType: info.mimeType,
      url: info.url,
    });

    await this.repo.save(attachment);

    this.logger.info('Attachment confirmed', {
      attachmentId: attachment.id,
      sha256: attachment.sha256Digest,
    });

    return {
      id: attachment.id,
      status: attachment.status,
      url: attachment.url,
      sha256Digest: attachment.sha256Digest,
    };
  }
}
