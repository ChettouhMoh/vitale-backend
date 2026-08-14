import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  Attachment,
  AttachmentType,
  AttachmentTypeValue,
  detectMimeFromBytes,
  UploadStrategy,
} from '@/attachment/domain';
import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { LoggerService } from '@/common/logger/logger.service';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';

/**
 * Minimal multer/buffer file shape (avoids needing @types/multer).
 */
export interface UploadableFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

export interface UploadedAttachment {
  id: string;
  type: string;
  status: string;
  url: string | null;
  mimeType: string;
  sizeBytes: number;
  sha256Digest: string | null;
}

/**
 * AttachmentModule's application service — the single home for proxy uploads.
 * Works without an authenticated principal: the caller supplies `ownerId`
 * directly, which lets the signup flow (pre-verification, no JWT) attach an
 * avatar to the just-created doctor while every other caller passes
 * `@CurrentUser('id')`.
 */
@Injectable()
export class UploadAttachmentService {
  constructor(
    @Inject(IStorageProvider) private readonly storage: IStorageProvider,
    @Inject(IAttachmentRepository) private readonly repo: IAttachmentRepository,
    private readonly logger: LoggerService,
  ) {}

  /** Avatar upload used by the signup flow (strategy pinned to Avatar / proxy). */
  uploadAvatar(
    file: UploadableFile,
    ownerId: string,
  ): Promise<UploadedAttachment> {
    return this.upload(file, AttachmentTypeValue.Avatar, ownerId);
  }

  /**
   * General proxy upload. Proxy-only types are enforced here too: a presigned
   * type (MedicalDegree, etc.) cannot be routed through this path and will throw.
   */
  async upload(
    file: UploadableFile,
    type: AttachmentTypeValue,
    ownerId: string,
  ): Promise<UploadedAttachment> {
    const attachmentType = AttachmentType.create(type);
    // 1. This type must be uploaded via the proxy strategy.
    attachmentType.assertStrategy(UploadStrategy.Proxy);

    const sizeBytes = file.buffer.length;
    // 2. Per-type size ceiling.
    attachmentType.assertSizeWithinLimit(sizeBytes);

    // 3. Sniff the ACTUAL bytes — the real defense against Content-Type spoofing.
    const sniffed = detectMimeFromBytes(file.buffer);
    if (!sniffed) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_FILE,
        'Unrecognized file content',
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
    attachmentType.assertMimeAllowed(sniffed);

    const sha256Digest = createHash('sha256').update(file.buffer).digest('hex');

    // Build the aggregate (born ACTIVE), store the bytes, then link the URL.
    const attachment = Attachment.createActiveFromUpload({
      type: attachmentType,
      ownerId,
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
