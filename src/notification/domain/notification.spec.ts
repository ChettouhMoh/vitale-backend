import { describe, expect, it } from '@jest/globals';
import { Notification } from './notification';
import {
  Locale,
  NotificationType,
  NotificationTypeValue,
  Recipient,
} from './value-objects';
import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';

function build(): Notification {
  const type = NotificationType.create(NotificationTypeValue.PasswordReset);
  const channel = type.defaultChannel;
  return Notification.createNew({
    eventId: 'evt-1',
    type,
    channel,
    locale: Locale.create('fr'),
    recipient: Recipient.forChannel('User@Example.com', channel),
    subject: 'Réinitialisez votre mot de passe',
  });
}

describe('Notification', () => {
  it('is created pending, with a normalised recipient and zero attempts', () => {
    const n = build();
    expect(n.id).toEqual(expect.any(String));
    expect(n.status).toBe('pending');
    expect(n.recipient).toBe('user@example.com'); // trimmed + lower-cased
    expect(n.channel).toBe('email');
    expect(n.attempts).toBe(0);
    expect(n.isSent).toBe(false);
    expect(n.sentAt).toBeNull();
  });

  it('markSent records the provider id and timestamp', () => {
    const n = build();
    n.markSent('provider-msg-1');
    expect(n.isSent).toBe(true);
    expect(n.providerMessageId).toBe('provider-msg-1');
    expect(n.sentAt).not.toBeNull();
  });

  it('rejects a double send', () => {
    const n = build();
    n.markSent('provider-msg-1');
    try {
      n.markSent('provider-msg-2');
      throw new Error('expected to throw');
    } catch (err) {
      expect((err as DomainError).code).toBe(
        NotificationErrorCode.NOTIFICATION_ALREADY_SENT,
      );
    }
  });

  it('recordFailure increments attempts, truncates the error, and marks failed', () => {
    const n = build();
    n.recordFailure('x'.repeat(1000));
    expect(n.attempts).toBe(1);
    expect(n.lastError).toHaveLength(500);
    expect(n.isFailed).toBe(true);
  });

  it('never exposes a rendered body — only the subject is stored', () => {
    const record = build().toRecord();
    expect(record).toHaveProperty('subject');
    expect(record).not.toHaveProperty('html');
    expect(record).not.toHaveProperty('body');
    expect(record).not.toHaveProperty('text');
  });
});
