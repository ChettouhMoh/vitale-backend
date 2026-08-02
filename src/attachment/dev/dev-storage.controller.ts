import {
  Controller,
  Put,
  Param,
  Req,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { IStorageProvider } from '@/attachment/ports/storage-provider.interface';

/**
 * Structural view of the in-memory fake's dev seam — lets us receive the
 * simulated client PUT without coupling this controller to the concrete class.
 */
interface DevStorageSink {
  completePresignedUpload(
    token: string,
    buffer: Buffer,
    mimeType?: string,
  ): { key: string };
}

/**
 * DEV-ONLY. The presigned `uploadUrl` from the in-memory storage provider points
 * here; this endpoint lands the raw PUT body into the fake store so the
 * presigned → confirm flow can be exercised end-to-end with zero cloud creds.
 * A real deployment uses a real bucket and never registers this.
 */
@ApiExcludeController()
@Controller({ path: 'attachments', version: '1' })
export class DevStorageController {
  constructor(
    @Inject(IStorageProvider)
    private readonly storage: IStorageProvider,
  ) {}

  @Put('_dev/presigned/:token')
  async put(
    @Param('token') token: string,
    @Req() req: Request,
  ): Promise<{ key: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const sink = this.storage as unknown as DevStorageSink;
    if (typeof sink.completePresignedUpload !== 'function') {
      throw new BadRequestException(
        'Presigned dev sink is only available with the in-memory storage provider',
      );
    }

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

    const contentType = req.headers['content-type'];
    return sink.completePresignedUpload(
      token,
      buffer,
      typeof contentType === 'string' ? contentType : undefined,
    );
  }
}
