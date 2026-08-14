import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IStorageProvider,
  PresignedUpload,
  StoredObjectInfo,
} from '@/attachment/ports/storage-provider.interface';

/**
 * Cloudflare R2 adapter — S3-compatible, so the AWS SDK talks to it directly.
 * R2 has no region (use "auto"), bills nothing for egress, and returns an ETag
 * that is the MD5 of the object for single-part uploads (<= 5GB), so
 * `verifyExists` can trust it as the sha256-equivalent digest the confirm step
 * compares against.
 */
@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = config.get<string>('R2_BUCKET');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'R2 storage is enabled but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / ' +
          'R2_SECRET_ACCESS_KEY / R2_BUCKET are not all set.',
      );
    }

    this.bucket = bucket;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Prefer an explicit public/CDN base if provided; otherwise R2's S3 API path
    // works for objects served through a public-access bucket + custom domain.
    const cdn = config.get<string>('R2_PUBLIC_URL');
    this.publicUrlBase = cdn
      ? cdn.replace(/\/+$/, '')
      : `https://${accountId}.r2.cloudflarestorage.com/${this.bucket}`;
  }

  private url(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }

  async upload(input: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return { url: this.url(input.key) };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async createPresignedUpload(input: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds: number;
  }): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.mimeType,
      // Bucket policy / R2 object-size limit enforces `maxBytes`; the SDK can't
      // embed it in the URL, so it's validated by the confirm handler via
      // `verifyExists` against the AttachmentType constraint.
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

  async verifyExists(key: string): Promise<StoredObjectInfo | null> {
    try {
      const { ContentLength, ETag } = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!ContentLength) return null;
      return {
        sizeBytes: Number(ContentLength),
        sha256Digest: (ETag || '').replace(/"/g, ''),
        mimeType: '',
        url: this.url(key),
      };
    } catch {
      // NoSuchKey / 404 → object was never uploaded.
      return null;
    }
  }
}
