import { Module } from '@nestjs/common';
import { UploadAttachmentController } from './use-cases/upload-attachment/upload-attachment.controller';
import { RequestPresignedUploadController } from './use-cases/request-presigned-upload/request-presigned-upload.controller';
import { ConfirmUploadController } from './use-cases/confirm-upload/confirm-upload.controller';
import { DeleteAttachmentController } from './use-cases/delete-attachment/delete-attachment.controller';
import { DevStorageController } from './dev/dev-storage.controller';

@Module({
  controllers: [
    UploadAttachmentController,
    RequestPresignedUploadController,
    ConfirmUploadController,
    DeleteAttachmentController,
    // Dev-only presigned PUT sink (no-op in production).
    DevStorageController,
  ],
})
export class AttachmentModule {}
