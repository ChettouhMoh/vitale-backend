import { Controller, Delete, Param, Body, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { DeleteAttachmentDto } from './delete-attachment.dto';
import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class DeleteAttachmentController {
  constructor(
    @Inject(IAttachmentRepository)
    private readonly repo: IAttachmentRepository,
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
    private readonly logger: LoggerService,
  ) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attachment (owner only)' })
  @ApiParam({ name: 'id', description: 'Attachment id' })
  @ApiBody({ type: DeleteAttachmentDto })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async execute(
    @Param('id') id: string,
    @Body() dto: DeleteAttachmentDto,
  ): Promise<{ success: boolean }> {
    const attachment = await this.repo.findById(id);
    if (!attachment) {
      throw new DomainError(
        AttachmentErrorCode.ATTACHMENT_NOT_FOUND,
        `Attachment ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    attachment.assertOwnedBy(dto.ownerId);

    // Remove the bytes first, then soft-delete the row.
    await this.storage.delete(attachment.storageKey);
    attachment.markDeleted();
    await this.repo.save(attachment);

    this.logger.info('Attachment deleted', { attachmentId: attachment.id });

    return { success: true };
  }
}
