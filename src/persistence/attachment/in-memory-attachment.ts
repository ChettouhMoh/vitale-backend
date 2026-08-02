import { Injectable } from '@nestjs/common';
import { Attachment } from '@/attachment/domain/attachment';
import { IAttachmentRepository } from '@/attachment/ports/attachment.repository.interface';

@Injectable()
export class InMemoryAttachmentRepository implements IAttachmentRepository {
  private readonly store = new Map<string, Attachment>();

  async save(attachment: Attachment): Promise<void> {
    this.store.set(attachment.id, attachment);
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.store.get(id) ?? null;
  }
}
