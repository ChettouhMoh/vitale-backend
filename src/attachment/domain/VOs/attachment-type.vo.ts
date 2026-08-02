import { AttachmentErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { AttachmentTypeValue, UploadStrategy } from '../attachment.enums';

const MB = 1024 * 1024;

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

interface TypeConstraints {
  readonly maxBytes: number;
  readonly allowedMimes: readonly string[];
  readonly strategy: UploadStrategy;
}

/**
 * The single source of truth for what each attachment type allows. Small,
 * low-risk media (avatars, ID photos) go through the proxy so the backend can
 * sniff their bytes; large credential documents use presigned direct-to-storage
 * uploads with a confirm step.
 */
const CONSTRAINTS: Record<AttachmentTypeValue, TypeConstraints> = {
  [AttachmentTypeValue.Avatar]: {
    maxBytes: 5 * MB,
    allowedMimes: IMAGE_MIMES,
    strategy: UploadStrategy.Proxy,
  },
  [AttachmentTypeValue.NationalIdFront]: {
    maxBytes: 10 * MB,
    allowedMimes: DOC_MIMES,
    strategy: UploadStrategy.Proxy,
  },
  [AttachmentTypeValue.NationalIdBack]: {
    maxBytes: 10 * MB,
    allowedMimes: DOC_MIMES,
    strategy: UploadStrategy.Proxy,
  },
  [AttachmentTypeValue.MedicalDegree]: {
    maxBytes: 20 * MB,
    allowedMimes: DOC_MIMES,
    strategy: UploadStrategy.Presigned,
  },
  [AttachmentTypeValue.PracticeLicense]: {
    maxBytes: 20 * MB,
    allowedMimes: DOC_MIMES,
    strategy: UploadStrategy.Presigned,
  },
  [AttachmentTypeValue.EthicsCouncilCertificate]: {
    maxBytes: 20 * MB,
    allowedMimes: DOC_MIMES,
    strategy: UploadStrategy.Presigned,
  },
  [AttachmentTypeValue.TenancyAgreement]: {
    maxBytes: 20 * MB,
    allowedMimes: DOC_MIMES,
    strategy: UploadStrategy.Presigned,
  },
};

/**
 * AttachmentType — VO that owns the storage-path taxonomy and the per-type
 * constraints. Genuinely heavy domain logic (rules table, path building,
 * strategy enforcement), so it earns being a VO rather than a bare enum.
 */
export class AttachmentType {
  private constructor(private readonly _value: AttachmentTypeValue) {}

  static create(value: string): AttachmentType {
    const match = Object.values(AttachmentTypeValue).find((t) => t === value);
    if (!match) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_ATTACHMENT_TYPE,
        `Unknown attachment type: ${value}. Allowed: ${Object.values(AttachmentTypeValue).join(', ')}`,
      );
    }
    return new AttachmentType(match);
  }

  get value(): AttachmentTypeValue {
    return this._value;
  }

  private get constraints(): TypeConstraints {
    return CONSTRAINTS[this._value];
  }

  get maxBytes(): number {
    return this.constraints.maxBytes;
  }
  get allowedMimes(): readonly string[] {
    return this.constraints.allowedMimes;
  }
  get strategy(): UploadStrategy {
    return this.constraints.strategy;
  }

  /**
   * Deterministic, owner-isolated storage key: `<type>/<ownerId>/<fileId>`.
   * The key is always server-derived — never built from a client filename — so
   * it can't collide across owners or be steered via path traversal.
   */
  storageKey(ownerId: string, fileId: string): string {
    return `${this._value}/${ownerId}/${fileId}`;
  }

  assertMimeAllowed(mime: string): void {
    if (!this.allowedMimes.includes(mime)) {
      throw new DomainError(
        AttachmentErrorCode.MIME_TYPE_NOT_ALLOWED,
        `MIME "${mime}" not allowed for ${this._value} (allowed: ${this.allowedMimes.join(', ')})`,
      );
    }
  }

  assertSizeWithinLimit(bytes: number): void {
    if (bytes <= 0) {
      throw new DomainError(
        AttachmentErrorCode.INVALID_FILE,
        'File is empty',
      );
    }
    if (bytes > this.maxBytes) {
      throw new DomainError(
        AttachmentErrorCode.FILE_TOO_LARGE,
        `File is ${bytes} bytes, exceeds the ${this.maxBytes} byte limit for ${this._value}`,
      );
    }
  }

  /** Enforces that this type is uploaded via the strategy it declares. */
  assertStrategy(attempted: UploadStrategy): void {
    if (this.strategy !== attempted) {
      throw new DomainError(
        AttachmentErrorCode.UPLOAD_STRATEGY_NOT_ALLOWED,
        `${this._value} must be uploaded via "${this.strategy}", not "${attempted}"`,
      );
    }
  }
}
