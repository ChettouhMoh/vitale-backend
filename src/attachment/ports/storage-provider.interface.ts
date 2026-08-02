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

/**
 * IStorageProvider — the storage port. A real adapter (S3 / GCS / Cloudinary)
 * or the in-memory fake implements it. Expanded well beyond temtem's
 * upload/delete: it also mints presigned URLs and verifies uploaded objects so
 * the presigned + confirm flow is possible.
 */
export interface IStorageProvider {
  /** Proxy path: store bytes the backend has already validated. Returns a URL. */
  upload(input: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string }>;

  /** Remove an object (idempotent). */
  delete(key: string): Promise<void>;

  /** Mint a short-lived direct-to-storage upload URL for the given key. */
  createPresignedUpload(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds: number;
  }): Promise<PresignedUpload>;

  /**
   * Confirm an object actually exists and return its real metadata, or null if
   * it was never uploaded. Used by confirm-upload to avoid trusting the client.
   */
  verifyExists(key: string): Promise<StoredObjectInfo | null>;
}

export const IStorageProvider = Symbol('IStorageProvider');
