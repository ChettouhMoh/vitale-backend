import {
  Controller,
  Get,
  Param,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';
import { LoggerService } from '@/common/logger/logger.service';
import { CurrentUser } from '@/auth/decorators';
import { Role } from '@/auth/domain';

const PRESIGNED_GET_TTL_SECONDS = 15 * 60; // 15 minutes

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class GetAttachmentUrlController {
  constructor(
    @Inject(IAttachmentRepository)
    private readonly repo: IAttachmentRepository,
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
    private readonly logger: LoggerService,
  ) {}

  @Get(':id/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get a short-lived presigned URL for a private attachment (owner or admin only)',
  })
  @ApiParam({ name: 'id', description: 'Attachment id' })
  @ApiResponse({ status: 200, description: 'Presigned GET URL returned' })
  @ApiResponse({ status: 403, description: 'Not the owner and not an admin' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({
    status: 400,
    description:
      'Attachment is not a private type (use the stored url directly)',
  })
  async execute(
    @CurrentUser() principal: { id: string; role: Role },
    @Param('id') id: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const attachment = await this.repo.findById(id);
    if (!attachment) {
      throw new DomainError(
        AttachmentErrorCode.ATTACHMENT_NOT_FOUND,
        `Attachment ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Public assets (avatars, logos) have a permanent public URL stored on
    // the row — no presign needed. This endpoint is for private assets only.
    if (!attachment.typeVO.isPrivate) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_ATTACHMENT_TYPE,
        'This attachment type is public; use the stored url directly',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Authorization: owner or admin/superadmin only.
    const isOwner = principal.id === attachment.ownerId;
    const isAdmin =
      principal.role === Role.Admin || principal.role === Role.SuperAdmin;
    if (!isOwner && !isAdmin) {
      throw new DomainError(
        AttachmentErrorCode.NOT_OWNER,
        'You do not have access to this attachment',
        HttpStatus.FORBIDDEN,
      );
    }

    const presigned = await this.storage.createPresignedGetUrl({
      key: attachment.storageKey,
      expiresInSeconds: PRESIGNED_GET_TTL_SECONDS,
      bucket: 'private',
    });

    this.logger.info('Presigned GET URL issued', {
      attachmentId: attachment.id,
      requester: principal.id,
      role: principal.role,
    });

    return {
      url: presigned.url,
      expiresAt: presigned.expiresAt,
    };
  }
}
