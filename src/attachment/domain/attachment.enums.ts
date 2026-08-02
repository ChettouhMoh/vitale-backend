/**
 * Attachment enums — shared by the domain, the AttachmentType VO, and the DTOs.
 */

/** The closed taxonomy of attachment kinds Vitale supports. */
export enum AttachmentTypeValue {
  Avatar = 'avatar',
  NationalIdFront = 'national-id-front',
  NationalIdBack = 'national-id-back',
  MedicalDegree = 'medical-degree',
  PracticeLicense = 'practice-license',
  EthicsCouncilCertificate = 'ethics-council-certificate',
  TenancyAgreement = 'tenancy-agreement',
}

/**
 * How bytes reach storage:
 * - proxy     → client → backend (validated, magic-byte sniffed) → storage
 * - presigned → client → storage directly, then a confirm step verifies it
 */
export enum UploadStrategy {
  Proxy = 'proxy',
  Presigned = 'presigned',
}

/** Attachment lifecycle. */
export enum AttachmentStatus {
  /** Presigned row created; bytes not yet verified in storage. */
  Pending = 'PENDING',
  /** Bytes are in storage and verified; safe to reference. */
  Active = 'ACTIVE',
  /** Soft-deleted; storage object removed. */
  Deleted = 'DELETED',
  /** Presign was never confirmed before its TTL — abandoned. */
  Expired = 'EXPIRED',
}
