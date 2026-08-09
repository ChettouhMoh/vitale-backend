import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { SendNotificationService } from './send-notification.service';
import {
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
import { LoggerService } from '@/common/logger/logger.service';

const rendered = { subject: 'S', html: '<p>hi</p>', text: 'hi' };

function makeService() {
  const repo = {
    findByEventAndType: jest.fn<INotificationRepository['findByEventAndType']>(),
    save: jest.fn<INotificationRepository['save']>(),
    findById: jest.fn<INotificationRepository['findById']>(),
    findFailed: jest.fn<INotificationRepository['findFailed']>(),
  };
  const renderer = { render: jest.fn<ITemplateRenderer['render']>() };
  const email = { send: jest.fn<IEmailChannel['send']>() };
  const sms = { send: jest.fn<ISmsChannel['send']>() };
  const push = { send: jest.fn<IPushChannel['send']>() };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  renderer.render.mockResolvedValue(rendered);
  repo.findByEventAndType.mockResolvedValue(null);
  repo.save.mockResolvedValue(undefined);

  const service = new SendNotificationService(
    repo as unknown as INotificationRepository,
    renderer as unknown as ITemplateRenderer,
    email as unknown as IEmailChannel,
    sms as unknown as ISmsChannel,
    push as unknown as IPushChannel,
    logger as unknown as LoggerService,
  );
  return { service, repo, renderer, email };
}

const input = {
  eventId: 'evt-1',
  type: NotificationTypeValue.PasswordReset,
  recipient: 'user@example.com',
  locale: 'fr',
  data: { resetLink: 'https://x', expiresAt: '2026-08-10' },
};

describe('SendNotificationService', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('skips a duplicate when a sent record already exists for (eventId, type, channel)', async () => {
    const type = NotificationType.create(NotificationTypeValue.PasswordReset);
    const channel = type.defaultChannel;
    const alreadySent = Notification.createNew({
      eventId: 'evt-1',
      type,
      channel,
      locale: Locale.create('fr'),
      recipient: Recipient.forChannel('user@example.com', channel),
      subject: 'S',
    });
    alreadySent.markSent('prev');
    ctx.repo.findByEventAndType.mockResolvedValue(alreadySent);

    await ctx.service.send(input);

    expect(ctx.renderer.render).not.toHaveBeenCalled();
    expect(ctx.email.send).not.toHaveBeenCalled();
  });

  it('saves a pending record BEFORE dispatching to the channel', async () => {
    ctx.email.send.mockResolvedValue({ providerMessageId: 'm1' });

    await ctx.service.send(input);

    expect(ctx.repo.save.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.email.send.mock.invocationCallOrder[0],
    );
  });

  it('on channel failure, records the failure and rethrows (does not swallow)', async () => {
    ctx.email.send.mockRejectedValue(new Error('smtp down'));

    await expect(ctx.service.send(input)).rejects.toThrow('smtp down');

    const saved = ctx.repo.save.mock.calls.map(
      (call) => call[0] as Notification,
    );
    expect(saved.length).toBe(2); // pending, then failed
    expect(saved[1].isFailed).toBe(true);
    expect(saved[1].attempts).toBe(1);
  });

  it('marks sent and records the provider id on success', async () => {
    ctx.email.send.mockResolvedValue({ providerMessageId: 'm-42' });

    await ctx.service.send(input);

    const saved = ctx.repo.save.mock.calls.map(
      (call) => call[0] as Notification,
    );
    const last = saved[saved.length - 1];
    expect(last.isSent).toBe(true);
    expect(last.providerMessageId).toBe('m-42');
  });
});
