import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AttachmentTypeValue } from '@/attachment/domain';
import {
  UploadAttachmentService,
  type UploadableFile,
} from '@/attachment/use-cases/upload-attachment/upload-attachment.service';
import {
  UploadAttachmentDto,
  UploadAttachmentResponse,
} from './upload-attachment.dto';
import { CurrentUser } from '@/auth/decorators';

// Hard ceiling to bound request memory; finer per-type limits live in the domain.
const MAX_PROXY_BYTES = 25 * 1024 * 1024;

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
export class UploadAttachmentController {
  constructor(private readonly attachment: UploadAttachmentService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a small attachment through the backend proxy',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: Object.values(AttachmentTypeValue),
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: UploadAttachmentResponse })
  @ApiResponse({
    status: 400,
    description: 'Strategy / MIME / size / magic-byte violation',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      // @types/multer is intentionally absent — memoryStorage is the one untyped call.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      storage: memoryStorage(),
      limits: { fileSize: MAX_PROXY_BYTES },
    }),
  )
  async execute(
    @CurrentUser('id') ownerId: string,
    @UploadedFile() file: UploadableFile | undefined,
    @Body() dto: UploadAttachmentDto,
  ): Promise<UploadAttachmentResponse> {
    if (!file?.buffer) throw new BadRequestException('file is required');

    const result = await this.attachment.upload(file, dto.type, ownerId);

    return {
      id: result.id,
      type: result.type,
      status: result.status,
      url: result.url,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      sha256Digest: result.sha256Digest,
    };
  }
}
