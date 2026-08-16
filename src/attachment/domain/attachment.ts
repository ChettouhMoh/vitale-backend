import { v7 as uuidv7 } from 'uuid';
import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { AttachmentStatus } from './attachment.enums';
import { AttachmentType } from './VOs/attachment-type.vo';

// ─── Shared shapes ──────────────────────────────────────────────────────────

/** Persisted attachment row — storage-agnostic. `type` is the plain enum value. */
export interface AttachmentRecord {
  id: string;
  ownerId: string;
  type: string;
  status: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256Digest: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

interface AttachmentProps {
  ownerId: string;
  type: AttachmentType;
  status: AttachmentStatus;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256Digest: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class Attachment {
  private readonly _id: string;
  private props: AttachmentProps;

  private constructor(props: AttachmentProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /**
   * Proxy path: bytes have already been validated + stored by the caller. The
   * row is born ACTIVE with its content hash recorded. `url` is attached once
   * the storage provider returns it (see linkUploadedUrl).
   */
  static createActiveFromUpload(input: {
    type: AttachmentType;
    ownerId: string;
    mimeType: string;
    sizeBytes: number;
    sha256Digest: string;
  }): Attachment {
    const id = uuidv7();
    const now = new Date().toISOString();
    return new Attachment(
      {
        ownerId: input.ownerId,
        type: input.type,
        status: AttachmentStatus.Active,
        storageKey: input.type.storageKey(input.ownerId, id),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        sha256Digest: input.sha256Digest,
        url: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: null,
      },
      id,
    );
  }

  /**
   * Presigned path: a PENDING placeholder recording the *declared* mime/size and
   * a TTL. Nothing is trusted yet — the bytes live only in the client until the
   * confirm step verifies them.
   */
  static createPendingForPresign(input: {
    type: AttachmentType;
    ownerId: string;
    declaredMime: string;
    declaredSize: number;
    expiresAt: string;
  }): Attachment {
    const id = uuidv7();
    const now = new Date().toISOString();
    return new Attachment(
      {
        ownerId: input.ownerId,
        type: input.type,
        status: AttachmentStatus.Pending,
        storageKey: input.type.storageKey(input.ownerId, id),
        mimeType: input.declaredMime,
        sizeBytes: input.declaredSize,
        sha256Digest: null,
        url: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: input.expiresAt,
      },
      id,
    );
  }

  static restoreExisting(record: AttachmentRecord): Attachment {
    return new Attachment(
      {
        ownerId: record.ownerId,
        type: AttachmentType.create(record.type),
        status: record.status as AttachmentStatus,
        storageKey: record.storageKey,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        sha256Digest: record.sha256Digest,
        url: record.url,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        expiresAt: record.expiresAt,
      },
      record.id,
    );
  }

  toRecord(): AttachmentRecord {
    return {
      id: this._id,
      ownerId: this.props.ownerId,
      type: this.props.type.value,
      status: this.props.status,
      storageKey: this.props.storageKey,
      mimeType: this.props.mimeType,
      sizeBytes: this.props.sizeBytes,
      sha256Digest: this.props.sha256Digest,
      url: this.props.url,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      expiresAt: this.props.expiresAt,
    };
  }

  // ─── Behaviors ──────────────────────────────────────────────────────────────

  /** Records the public URL returned by the storage provider after a proxy upload. */
  linkUploadedUrl(url: string): void {
    this.props.url = url;
    this.props.updatedAt = new Date().toISOString();
  }

  /**
   * Promote a PENDING presign to ACTIVE — only after the storage provider has
   * confirmed the object exists. The ACTUAL size + mime from storage are
   * re-validated against the type's constraints (never trust the declared ones).
   */
  confirm(input: {
    sha256Digest: string;
    sizeBytes: number;
    mimeType: string;
    url: string;
  }): void {
    if (this.props.status !== AttachmentStatus.Pending) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_STATUS_TRANSITION,
        `Cannot confirm an attachment in status ${this.props.status}`,
        409,
      );
    }
    if (this.props.expiresAt && Date.parse(this.props.expiresAt) < Date.now()) {
      throw new DomainError(
        AttachmentErrorCode.PRESIGN_EXPIRED,
        'The presigned upload window has expired',
        410,
      );
    }

    // Re-validate the real object against the type rules, not the declaration.
    this.props.type.assertSizeWithinLimit(input.sizeBytes);
    this.props.type.assertMimeAllowed(input.mimeType);

    this.props.status = AttachmentStatus.Active;
    this.props.sha256Digest = input.sha256Digest;
    this.props.sizeBytes = input.sizeBytes;
    this.props.mimeType = input.mimeType;
    this.props.url = input.url;
    this.props.expiresAt = null;
    this.props.updatedAt = new Date().toISOString();
  }

  markDeleted(): void {
    if (this.props.status === AttachmentStatus.Deleted) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_STATUS_TRANSITION,
        'Attachment is already deleted',
        409,
      );
    }
    this.props.status = AttachmentStatus.Deleted;
    this.props.updatedAt = new Date().toISOString();
  }

  /** For a GC job: mark an abandoned PENDING presign EXPIRED. */
  expire(): void {
    if (this.props.status !== AttachmentStatus.Pending) return;
    this.props.status = AttachmentStatus.Expired;
    this.props.updatedAt = new Date().toISOString();
  }

  assertOwnedBy(ownerId: string): void {
    if (this.props.ownerId !== ownerId) {
      throw new DomainError(
        AttachmentErrorCode.NOT_OWNER,
        'You do not own this attachment',
        403,
      );
    }
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get type(): string {
    return this.props.type.value;
  }
  get typeVO(): AttachmentType {
    return this.props.type;
  }
  get collectionName(): string {
    return this.props.type.collectionName();
  }
  get status(): AttachmentStatus {
    return this.props.status;
  }
  get storageKey(): string {
    return this.props.storageKey;
  }
  get mimeType(): string {
    return this.props.mimeType;
  }
  get sizeBytes(): number {
    return this.props.sizeBytes;
  }
  get sha256Digest(): string | null {
    return this.props.sha256Digest;
  }
  get url(): string | null {
    return this.props.url;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get expiresAt(): string | null {
    return this.props.expiresAt;
  }
}
