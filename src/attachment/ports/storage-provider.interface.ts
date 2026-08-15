/**
 * Result of HEAD-ing an object in the store — the authoritative truth the
 * confirm step checks against (never the client's claim).
 */
export interface StoredObjectInfo {
  sizeBytes: number;
  sha256Digest: string;
  mimeType: string;
  url: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  expiresAt: string; // ISO
}

export interface PresignedGetUrl {
  url: string;
  expiresAt: string;
}

/**
 * IStorageProvider — the storage port. A real adapter (S3 / GCS / Cloudinary)
 * or the in-memory fake implements it. Expanded well beyond temtem's
 * upload/delete: it also mints presigned URLs and verifies uploaded objects so
 * the presigned + confirm flow is possible.
 *
 * Buckets:
 * - Public bucket: avatars, logos — permanent public URLs.
 * - Private bucket: KYC / identity docs — no public reads; access is only via
 *   `createPresignedGetUrl` after an authorization check.
 */
export interface IStorageProvider {
  /** Resolve the effective bucket for a given logical bucket name. */
  resolveBucket(bucket: string): string;

  /** Proxy path: store bytes the backend has already validated. Returns a URL. */
  upload(input: {
    key: string;
    buffer: Buffer;
    mimeType: string;
    bucket?: string;
  }): Promise<{ url: string }>;

  /** Remove an object (idempotent). */
  delete(input: { key: string; bucket?: string }): Promise<void>;

  /** Mint a short-lived direct-to-storage upload URL for the given key. */
  createPresignedUpload(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds: number;
    bucket?: string;
  }): Promise<PresignedUpload>;

  /**
   * Confirm an object actually exists and return its real metadata, or null if
   * it was never uploaded. Used by confirm-upload to avoid trusting the client.
   */
  verifyExists(input: {
    key: string;
    bucket?: string;
  }): Promise<StoredObjectInfo | null>;

  /**
   * Mint a short-lived direct-to-storage GET URL for a private object.
   * Only the attachment owner or an admin may call this (enforced upstream).
   */
  createPresignedGetUrl(input: {
    key: string;
    expiresInSeconds: number;
    bucket?: string;
  }): Promise<PresignedGetUrl>;
}

export const IStorageProvider = Symbol('IStorageProvider');
