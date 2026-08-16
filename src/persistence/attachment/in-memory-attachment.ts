import { Injectable } from '@nestjs/common';
import { Attachment } from '@/attachment/domain/attachment';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';

/**
 * In-memory attachment repository — dev/test only. Methods are async to match
 * the IAttachmentRepository interface; ops are synchronous in memory.
 */
/* eslint-disable @typescript-eslint/require-await -- interface requires Promise returns */
@Injectable()
export class InMemoryAttachmentRepository implements IAttachmentRepository {
  private readonly store = new Map<string, Attachment>();

  async save(attachment: Attachment): Promise<void> {
    this.store.set(attachment.id, attachment);
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.store.get(id) ?? null;
  }

  async listAll(): Promise<Attachment[]> {
    return Array.from(this.store.values());
  }
}
