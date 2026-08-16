import { Global, Module } from '@nestjs/common';
import { UploadAttachmentService } from './use-cases/upload-attachment/upload-attachment.service';
import { UploadAttachmentController } from './use-cases/upload-attachment/upload-attachment.controller';
import { RequestPresignedUploadController } from './use-cases/request-presigned-upload/request-presigned-upload.controller';
import { ConfirmUploadController } from './use-cases/confirm-upload/confirm-upload.controller';
import { DeleteAttachmentController } from './use-cases/delete-attachment/delete-attachment.controller';
import { GetAttachmentUrlController } from './use-cases/get-attachment-url/get-attachment-url.controller';
import { DevStorageController } from './dev/dev-storage.controller';
import { DevListAttachmentsController } from './dev/dev-list-attachments.controller';

/**
 * Attachment bounded context. Global so its `UploadAttachmentService` can be
 * injected by the auth context (signup avatar upload) without an explicit import.
 */
@Global()
@Module({
  controllers: [
    UploadAttachmentController,
    RequestPresignedUploadController,
    ConfirmUploadController,
    DeleteAttachmentController,
    GetAttachmentUrlController,
    DevStorageController,
    DevListAttachmentsController,
  ],
  providers: [UploadAttachmentService],
  exports: [UploadAttachmentService],
})
export class AttachmentModule {}
