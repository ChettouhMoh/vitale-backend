import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  IStorageProvider,
  PresignedUpload,
  StoredObjectInfo,
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
 * The presigned `uploadUrl` points back at a dev-only PUT sink
 * (`/v1/attachments/_dev/presigned/:token`) that lands bytes here via
 * `completePresignedUpload`, so the end-to-end presigned path is fully
 * exercisable with curl. A real S3/Cloudinary adapter implements the same port.
 */
@Injectable()
export class InMemoryStorageProvider implements IStorageProvider {
  private readonly objects = new Map<string, StoredObject>();
  private readonly presigns = new Map<string, PresignSlot>();

  private baseUrl(): string {
    const port = process.env.PORT ?? '3000';
    return `http://localhost:${port}`;
  }

  private publicUrl(key: string): string {
    return `${this.baseUrl()}/files/${key}`;
  }

  private static digest(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  async upload(input: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string }> {
    this.objects.set(input.key, {
      buffer: input.buffer,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      sha256Digest: InMemoryStorageProvider.digest(input.buffer),
    });
    return { url: this.publicUrl(input.key) };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async createPresignedUpload(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds: number;
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

  async verifyExists(key: string): Promise<StoredObjectInfo | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return {
      sizeBytes: obj.sizeBytes,
      sha256Digest: obj.sha256Digest,
      mimeType: obj.mimeType,
      url: this.publicUrl(key),
    };
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
    this.objects.set(slot.key, {
      buffer,
      mimeType: mimeType || slot.mimeType,
      sizeBytes: buffer.length,
      sha256Digest: InMemoryStorageProvider.digest(buffer),
    });
    this.presigns.delete(token);
    return { key: slot.key };
  }
}
