import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  IStorageProvider,
  PresignedUpload,
  StoredObjectInfo,
  PresignedGetUrl,
} from '@/attachment/ports/storage-provider.interface';

interface StoredObject {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  sha256Digest: string;
}

interface PresignSlot {
  key: string;
  mimeType: string;
  maxBytes: number;
  expiresAtMs: number;
}

/**
 * Fake storage provider — keeps everything in memory so the whole attachment
 * flow (including presigned + confirm) runs with zero cloud credentials.
 *
 * Buckets:
 * - `public` → objects served at `/files/<key>` (no auth).
 * - `private` → objects served at `/private/files/<key>` with a short-lived
 *   bearer token (simulates presigned GET).
 *
 * The presigned `uploadUrl` points back at a dev-only PUT sink
 * (`/v1/attachments/_dev/presigned/:token`) that lands bytes here via
 * `completePresignedUpload`, so the end-to-end presigned path is fully
 * exercisable with curl. A real S3/Cloudinary adapter implements the same port.
 */
/* eslint-disable @typescript-eslint/require-await -- in-memory impl; interface requires Promise returns but ops are synchronous */
@Injectable()
export class InMemoryStorageProvider implements IStorageProvider {
  private readonly objects = new Map<string, StoredObject>();
  private readonly presigns = new Map<string, PresignSlot>();
  private readonly getTokens = new Map<
    string,
    { key: string; expiresAtMs: number }
  >();

  private port = '3000';

  /** Allow tests/dev to override the port the dev server runs on. */
  setPort(port: string): void {
    this.port = port;
  }

  private baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  private publicUrl(key: string): string {
    return `${this.baseUrl()}/files/${key}`;
  }

  private privateUrl(key: string): string {
    return `${this.baseUrl()}/private/files/${key}`;
  }

  private static digest(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  resolveBucket(bucket: string): string {
    return bucket === 'private' ? 'private' : 'public';
  }

  async upload(input: {
    key: string;
    buffer: Buffer;
    mimeType: string;
    bucket?: string;
  }): Promise<{ url: string }> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    const entry: StoredObject = {
      buffer: input.buffer,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      sha256Digest: InMemoryStorageProvider.digest(input.buffer),
    };
    this.objects.set(`${bucket}:${input.key}`, entry);
    const url =
      bucket === 'private'
        ? this.privateUrl(input.key)
        : this.publicUrl(input.key);
    return { url };
  }

  async delete(input: { key: string; bucket?: string }): Promise<void> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    this.objects.delete(`${bucket}:${input.key}`);
  }

  async createPresignedUpload(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds: number;
    bucket?: string;
  }): Promise<PresignedUpload> {
    const token = randomUUID();
    const expiresAtMs = Date.now() + input.expiresInSeconds * 1000;
    this.presigns.set(token, {
      key: input.key,
      mimeType: input.mimeType,
      maxBytes: input.maxBytes,
      expiresAtMs,
    });
    return {
      uploadUrl: `${this.baseUrl()}/v1/attachments/_dev/presigned/${token}`,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  async verifyExists(input: {
    key: string;
    bucket?: string;
  }): Promise<StoredObjectInfo | null> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    const obj = this.objects.get(`${bucket}:${input.key}`);
    if (!obj) return null;
    const url =
      bucket === 'private'
        ? this.privateUrl(input.key)
        : this.publicUrl(input.key);
    return {
      sizeBytes: obj.sizeBytes,
      sha256Digest: obj.sha256Digest,
      mimeType: obj.mimeType,
      url,
    };
  }

  /**
   * Dev-only presigned GET: mint a short-lived bearer token the client can
   * exchange for the private object via the dev sink.
   */
  async createPresignedGetUrl(input: {
    key: string;
    expiresInSeconds: number;
    bucket?: string;
  }): Promise<PresignedGetUrl> {
    const token = randomUUID();
    const expiresAtMs = Date.now() + input.expiresInSeconds * 1000;
    this.getTokens.set(token, { key: input.key, expiresAtMs });
    const url = `${this.baseUrl()}/v1/attachments/_dev/get/${token}`;
    return {
      url,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  /** Dev-only: consume a presigned GET token and return the object. */
  completePresignedGet(
    token: string,
  ): { buffer: Buffer; mimeType: string } | null {
    const entry = this.getTokens.get(token);
    if (!entry) return null;
    if (entry.expiresAtMs < Date.now()) {
      this.getTokens.delete(token);
      return null;
    }
    // Look up in either bucket — the token itself encodes which key was requested.
    const obj =
      this.objects.get(`private:${entry.key}`) ??
      this.objects.get(`public:${entry.key}`);
    if (!obj) return null;
    this.getTokens.delete(token);
    return { buffer: obj.buffer, mimeType: obj.mimeType };
  }

  /**
   * Dev-only seam: the presigned PUT lands here (simulating the client uploading
   * directly to storage). Enforces the presign's TTL and size ceiling — exactly
   * what a real bucket policy would.
   */
  completePresignedUpload(
    token: string,
    buffer: Buffer,
    mimeType?: string,
  ): { key: string } {
    const slot = this.presigns.get(token);
    if (!slot) throw new Error('Unknown upload token');
    if (slot.expiresAtMs < Date.now()) {
      this.presigns.delete(token);
      throw new Error('Upload URL has expired');
    }
    if (buffer.length > slot.maxBytes) {
      throw new Error('Object exceeds the presigned size limit');
    }
    this.objects.set(`public:${slot.key}`, {
      buffer,
      mimeType: mimeType || slot.mimeType,
      sizeBytes: buffer.length,
      sha256Digest: InMemoryStorageProvider.digest(buffer),
    });
    this.presigns.delete(token);
    return { key: slot.key };
  }
}
