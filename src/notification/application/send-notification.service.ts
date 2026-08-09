import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes';
import { LoggerService } from '@/common/logger/logger.service';
import {
  Channel,
  Locale,
  Notification,
  NotificationType,
  NotificationTypeValue,
  Recipient,
} from '../domain';
import {
  IEmailChannel,
  INotificationRepository,
  IPushChannel,
  ISmsChannel,
  ITemplateRenderer,
} from '../ports';

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * SendNotificationService — the single orchestration path. Every handler funnels
 * through `send`; handlers hold no sending logic of their own.
 */
@Injectable()
export class SendNotificationService {
  constructor(
    @Inject(INotificationRepository)
    private readonly repo: INotificationRepository,
    @Inject(ITemplateRenderer)
    private readonly renderer: ITemplateRenderer,
    @Inject(IEmailChannel)
    private readonly email: IEmailChannel,
    @Inject(ISmsChannel)
    private readonly sms: ISmsChannel,
    @Inject(IPushChannel)
    private readonly push: IPushChannel,
    private readonly logger: LoggerService,
  ) {}

  async send(input: {
    eventId: string;
    type: NotificationTypeValue;
    recipient: string;
    locale: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const type = NotificationType.create(input.type);
    const channel = type.defaultChannel;
    const locale = Locale.create(input.locale);
    if (locale.fellBackToDefault) {
      this.logger.warn('Unknown locale on notification; fell back to default', {
        eventId: input.eventId,
        type: type.value,
        provided: input.locale,
      });
    }
    const recipient = Recipient.forChannel(input.recipient, channel);

    // 1. Idempotency guard — the defence against at-least-once delivery.
    const existing = await this.repo.findByEventAndType(
      input.eventId,
      type.value,
      channel.value,
    );
    if (existing?.isSent) {
      this.logger.debug('Notification already sent; skipping duplicate', {
        eventId: input.eventId,
        notificationId: existing.id,
        type: type.value,
        channel: channel.value,
      });
      return;
    }

    // 2 + 3. Render (throws TEMPLATE_NOT_FOUND / TEMPLATE_RENDER_FAILED).
    const rendered = await this.renderer.render(
      type.templateName,
      locale.value,
      input.data,
    );

    // 4. Persist a pending record BEFORE sending, so a crash mid-send leaves a
    //    trace rather than nothing. Reuse an existing (failed) record on retry.
    const notification =
      existing ??
      Notification.createNew({
        eventId: input.eventId,
        type,
        channel,
        locale,
        recipient,
        subject: rendered.subject,
      });
    await this.repo.save(notification);

    // 5 + 6. Dispatch, then record the outcome. On failure, rethrow — the events
    //        dispatcher owns retry, so the handler must not swallow it.
    try {
      const { providerMessageId } = await this.dispatch(channel, recipient, {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      notification.markSent(providerMessageId);
      await this.repo.save(notification);
      this.logger.info('Notification sent', {
        eventId: input.eventId,
        notificationId: notification.id,
        type: type.value,
        channel: channel.value,
        locale: locale.value,
        providerMessageId,
      });
    } catch (err) {
      notification.recordFailure(errorMessage(err));
      await this.repo.save(notification);
      this.logger.error('Notification send failed', {
        eventId: input.eventId,
        notificationId: notification.id,
        type: type.value,
        channel: channel.value,
        locale: locale.value,
        attempts: notification.attempts,
        error: errorMessage(err),
      });
      throw err;
    }
  }

  private dispatch(
    channel: Channel,
    recipient: Recipient,
    rendered: { subject: string; html: string; text: string },
  ): Promise<{ providerMessageId: string }> {
    if (channel.isEmail) {
      return this.email.send({
        to: recipient.value,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    }
    if (channel.isSms) {
      return this.sms.send({ to: recipient.value, text: rendered.text });
    }
    if (channel.isPush) {
      return this.push.send({
        deviceToken: recipient.value,
        title: rendered.subject,
        body: rendered.text,
      });
    }
    throw new DomainError(
      NotificationErrorCode.UNSUPPORTED_CHANNEL,
      `No adapter for channel ${channel.value}`,
    );
  }
}
