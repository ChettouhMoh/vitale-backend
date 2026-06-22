import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger } from 'pino';

/**
 * Context fields are spread at the root of every log line
 * (e.g. `{ userId, requestId }`), never nested under a `context` key.
 */
export type LogContext = Record<string, unknown>;

/**
 * Framework-agnostic application logger backed by raw Pino.
 *
 * - development: pretty-printed, colorised output via `pino-pretty`.
 * - production:  structured JSON on stdout (Pino's default), `debug` suppressed.
 *
 * Public interface is intentionally stable — `.info/.warn/.error/.debug(message, context?)`.
 */
@Injectable()
export class LoggerService implements OnModuleInit {
  private logger!: Logger;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    this.logger = pino({
      // Suppress debug logs in production, keep them in every other environment.
      level: isProduction ? 'info' : 'debug',
      // Emit an ISO-8601 timestamp instead of the default epoch milliseconds.
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        // Log the textual level ("info") rather than the numeric value (30).
        level: (label) => ({ level: label }),
      },
      // Pretty colours for humans in dev; plain JSON for machines in prod.
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
    });
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context ?? {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, message);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(context ?? {}, message);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(context ?? {}, message);
  }
}
