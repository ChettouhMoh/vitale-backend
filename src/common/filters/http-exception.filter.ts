import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '@/common/logger/logger.service';
import { DomainError } from '@/common/errors/domain.error';
import { InfrastructureError } from '@/common/errors/infrastructure.error';

/**
 * Shape returned to the client for every error, regardless of cause.
 */
interface ErrorResponseBody {
  code: string;
  message: string;
  path: string;
  timestamp: string;
  requestId: string;
}

/**
 * Internal mapping of an exception to an HTTP status, a client-safe code,
 * and a client-safe message.
 */
interface MappedException {
  status: number;
  code: string;
  message: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request['requestId'] as string | undefined) ?? 'unknown';

    const { status, code, message } = this.mapException(exception, requestId);

    const body: ErrorResponseBody = {
      code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    };

    response.status(status).json(body);
  }

  private mapException(exception: unknown, requestId: string): MappedException {
    // 1. Expected business-rule violation — safe to expose code + message.
    // The throw site chooses the status (404, 409, …); defaults to 400.
    if (exception instanceof DomainError) {
      return {
        status: exception.httpStatus,
        code: exception.code,
        message: exception.message,
      };
    }

    // 2. External dependency failure — log internals privately, expose nothing.
    if (exception instanceof InfrastructureError) {
      this.logger.error('Infrastructure failure', {
        requestId,
        code: exception.code,
        cause: exception.cause,
      });
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: exception.code,
        message: 'A required service is temporarily unavailable.',
      };
    }

    // 3. NestJS built-in HttpException — pass status and code through.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const httpResponse = exception.getResponse();
      const message =
        typeof httpResponse === 'string'
          ? httpResponse
          : ((httpResponse as { message?: string | string[] }).message ??
            exception.message);

      return {
        status,
        code: HttpStatus[status] ?? 'HTTP_ERROR',
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    // 4. Anything else — unknown/unhandled. Log the stack, leak nothing.
    const err = exception as Error;
    this.logger.error('Unhandled exception', {
      requestId,
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    };
  }
}
