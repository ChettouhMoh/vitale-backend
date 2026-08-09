import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { IPushChannel } from '../ports';

/**
 * Stub push channel — logs the message and returns a synthetic id. It exists to
 * prove the port is real; a production provider (FCM, APNs) implements the same
 * interface and swaps the binding in notification.module.ts.
 */
@Injectable()
export class ConsolePushChannel implements IPushChannel {
  constructor(private readonly logger: LoggerService) {}

  async send(message: {
    deviceToken: string;
    title: string;
    body: string;
  }): Promise<{ providerMessageId: string }> {
    this.logger.info('[console-push] would send push', {
      title: message.title,
    });
    return { providerMessageId: `console-push-${Date.now()}` };
  }
}
