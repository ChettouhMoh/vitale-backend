// Gmail SMTP is a DEVELOPMENT provider. Limits: ~500 recipients/day, aggressive
// throttling, and poor deliverability because a personal Gmail account has no
// SPF/DKIM alignment with the vitale.dz domain — mail frequently lands in spam.
// Production requires a transactional provider (Resend, SES, Postmark) with a
// verified sending domain. That is an adapter swap: implement IEmailChannel and
// change the binding in notification.module.ts. Nothing else changes.
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { LoggerService } from '@/common/logger/logger.service';
import { IEmailChannel } from '../ports';

@Injectable()
export class NodemailerEmailChannel implements IEmailChannel, OnModuleInit {
  private readonly transport: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.enabled = this.config.get<boolean>('NOTIFICATIONS_ENABLED', true);
    const fromName = this.config.get<string>('MAIL_FROM_NAME', 'Vitale');
    const fromAddress = this.config.get<string>('MAIL_FROM_ADDRESS', '');
    this.from = `"${fromName}" <${fromAddress}>`;

    // Built once — never per send.
    this.transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT', 465),
      secure: this.config.get<boolean>('SMTP_SECURE', true),
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Notifications disabled — email is log-only', {});
      return;
    }
    // Surface a wrong App Password at boot, not on the first password reset.
    try {
      await this.transport.verify();
      this.logger.info('SMTP transport verified', {});
    } catch (err) {
      this.logger.error('SMTP transport verification failed', {
        error: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  async send(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ providerMessageId: string }> {
    // The kill-switch lives HERE, in the adapter — the service still creates the
    // Notification record, so the full path is exercised locally and in tests.
    if (!this.enabled) {
      this.logger.info('[notifications disabled] email not sent', {
        to: message.to,
        subject: message.subject,
      });
      return { providerMessageId: `disabled-${Date.now()}` };
    }

    const info = await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { providerMessageId: info.messageId };
  }
}
