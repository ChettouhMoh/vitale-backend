import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { ISmsChannel } from '../ports';

/**
 * Stub SMS channel — logs the message and returns a synthetic id. It exists to
 * prove the port is real; a production provider (Twilio, Vonage) implements the
 * same interface and swaps the binding in notification.module.ts.
 */
@Injectable()
export class ConsoleSmsChannel implements ISmsChannel {
  constructor(private readonly logger: LoggerService) {}

  async send(message: {
    to: string;
    text: string;
  }): Promise<{ providerMessageId: string }> {
    this.logger.info('[console-sms] would send SMS', { to: message.to });
    return { providerMessageId: `console-sms-${Date.now()}` };
  }
}
