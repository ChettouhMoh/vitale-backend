import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IStorageProvider,
  PresignedUpload,
  StoredObjectInfo,
  PresignedGetUrl,
} from '@/attachment/ports/storage-provider.interface';

/**
 * Cloudflare R2 adapter — S3-compatible, so the AWS SDK talks to it directly.
 *
 * Buckets:
 * - Public bucket: avatars, logos — objects are served through the public CDN.
 * - Private bucket: KYC / identity docs — no public reads; access is via
 *   short-lived presigned GET URLs issued only after an authz check.
 */
@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly publicBucket: string;
  private readonly privateBucket: string;
  private readonly publicUrlBase: string;
  private readonly privateUrlBase: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    const publicBucket = config.get<string>('R2_PUBLIC_BUCKET');
    const privateBucket = config.get<string>('R2_PRIVATE_BUCKET');

    if (
      !accountId ||
      !accessKeyId ||
      !secretAccessKey ||
      !publicBucket ||
      !privateBucket
    ) {
      throw new Error(
        'R2 storage is enabled but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / ' +
          'R2_SECRET_ACCESS_KEY / R2_PUBLIC_BUCKET / R2_PRIVATE_BUCKET are not all set.',
      );
    }

    this.publicBucket = publicBucket;
    this.privateBucket = privateBucket;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const cdnPublic = config.get<string>('R2_PUBLIC_URL');
    this.publicUrlBase = cdnPublic
      ? cdnPublic.replace(/\/+$/, '')
      : `https://${accountId}.r2.cloudflarestorage.com/${publicBucket}`;

    const cdnPrivate = config.get<string>('R2_PRIVATE_URL');
    this.privateUrlBase = cdnPrivate
      ? cdnPrivate.replace(/\/+$/, '')
      : `https://${accountId}.r2.cloudflarestorage.com/${privateBucket}`;
  }

  /** Resolve the effective bucket name for a logical bucket identifier. */
  resolveBucket(bucket: string): string {
    return bucket === 'private' ? this.privateBucket : this.publicBucket;
  }

  private url(key: string, bucket: string): string {
    const base =
      bucket === 'private' ? this.privateUrlBase : this.publicUrlBase;
    return `${base}/${key}`;
  }

  async upload(input: {
    key: string;
    buffer: Buffer;
    mimeType: string;
    bucket?: string;
  }): Promise<{ url: string }> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return { url: this.url(input.key, input.bucket ?? 'public') };
  }

  async delete(input: { key: string; bucket?: string }): Promise<void> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: input.key }),
    );
  }

  async createPresignedUpload(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds: number;
    bucket?: string;
  }): Promise<PresignedUpload> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.mimeType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      uploadUrl,
      expiresAt: new Date(
        Date.now() + input.expiresInSeconds * 1000,
      ).toISOString(),
    };
  }

  async verifyExists(input: {
    key: string;
    bucket?: string;
  }): Promise<StoredObjectInfo | null> {
    const bucket = this.resolveBucket(input.bucket ?? 'public');
    try {
      // R2 does not reliably return Content-Type on HeadObject, so we use
      // GetObject instead and discard the body stream — we only need metadata.
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: bucket, Key: input.key }),
      );
      if (!response.ContentLength) return null;

      // Consume and discard the body so the HTTP connection can be reused.
      if (response.Body) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for await (const _chunk of response.Body as AsyncIterable<Uint8Array>) {
            // discard
          }
        } catch {
          // body read errors are non-fatal for a metadata check
        }
      }

      return {
        sizeBytes: Number(response.ContentLength),
        sha256Digest: (response.ETag || '').replace(/"/g, ''),
        mimeType: response.ContentType || '',
        url: this.url(input.key, input.bucket ?? 'public'),
      };
    } catch {
      return null;
    }
  }

  async createPresignedGetUrl(input: {
    key: string;
    expiresInSeconds: number;
    bucket?: string;
  }): Promise<PresignedGetUrl> {
    const bucket = this.resolveBucket(input.bucket ?? 'private');
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: input.key,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      url,
      expiresAt: new Date(
        Date.now() + input.expiresInSeconds * 1000,
      ).toISOString(),
    };
  }
}
