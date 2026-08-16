import { Injectable } from '@nestjs/common';
import { Attachment, AttachmentStatus } from '@/attachment/domain';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';

/**
 * In-memory attachment repository — dev/test only. Methods are async to match
 * the IAttachmentRepository interface; ops are synchronous in memory.
 *
 * Supports scope-specific collections so the same in-memory store can simulate
 * the multi-collection MongoDB layout (avatars, kyc_attachments, etc.).
 */
/* eslint-disable @typescript-eslint/require-await -- interface requires Promise returns */
@Injectable()
export class InMemoryAttachmentRepository implements IAttachmentRepository {
  private readonly collections = new Map<string, Map<string, Attachment>>();

  private collection(name: string): Map<string, Attachment> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  async save(attachment: Attachment): Promise<void> {
    this.collection(attachment.collectionName).set(attachment.id, attachment);
  }

  async findById(id: string, collection?: string): Promise<Attachment | null> {
    if (collection) {
      return this.collection(collection).get(id) ?? null;
    }
    // Fallback: scan all collections (dev only — production should pass collection).
    for (const col of this.collections.values()) {
      const found = col.get(id);
      if (found) return found;
    }
    return null;
  }

  async listAll(collection?: string): Promise<Attachment[]> {
    if (collection) {
      return Array.from(this.collection(collection).values());
    }
    return Array.from(this.collections.values()).flatMap((col) =>
      Array.from(col.values()),
    );
  }

  async findActiveByOwner(
    ownerId: string,
    collection: string,
  ): Promise<Attachment[]> {
    return Array.from(this.collection(collection).values()).filter(
      (a) => a.ownerId === ownerId && a.status === AttachmentStatus.Active,
    );
  }
}
