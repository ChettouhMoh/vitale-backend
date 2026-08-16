import { Attachment } from '../domain/attachment';

/**
 * IAttachmentRepository — persistence port for the Attachment aggregate.
 * Mirrors the other repos (Symbol DI token; in-memory impl for now).
 */
export interface IAttachmentRepository {
  save(attachment: Attachment): Promise<void>;
  findById(id: string, collection?: string): Promise<Attachment | null>;
  listAll(collection?: string): Promise<Attachment[]>;
  findActiveByOwner(ownerId: string, collection: string): Promise<Attachment[]>;
}

export const IAttachmentRepository = Symbol('IAttachmentRepository');
