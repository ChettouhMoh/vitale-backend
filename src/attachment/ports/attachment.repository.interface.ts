import { Attachment } from '../domain/attachment';

/**
 * IAttachmentRepository — persistence port for the Attachment aggregate.
 * Mirrors the other repos (Symbol DI token; in-memory impl for now).
 */
export interface IAttachmentRepository {
  save(attachment: Attachment): Promise<void>;
  findById(id: string): Promise<Attachment | null>;
}

export const IAttachmentRepository = Symbol('IAttachmentRepository');
