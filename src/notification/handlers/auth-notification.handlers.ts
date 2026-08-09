import { Injectable } from '@nestjs/common';
import { OnDomainEvent } from '@/shared/events/decorators';
import type { DomainEventPayload } from '@/shared/events/registry';
import { SendNotificationService } from '../application';
import { NotificationTypeValue } from '../domain';

/**
 * Turns auth-context facts into notifications. Thin adapters only — all sending
 * logic lives in SendNotificationService. Handlers do NOT catch: the events
 * dispatcher owns retry and dead-lettering.
 */
@Injectable()
export class AuthNotificationHandlers {
  constructor(private readonly sender: SendNotificationService) {}

  @OnDomainEvent('auth.email_verification_requested')
  async onEmailVerificationRequested(
    payload: DomainEventPayload<'auth.email_verification_requested'>,
    eventId: string,
  ): Promise<void> {
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.EmailVerification,
      recipient: payload.email,
      locale: payload.locale,
      data: {
        verificationLink: payload.verificationLink,
        expiresAt: payload.expiresAt,
      },
    });
  }

  @OnDomainEvent('auth.password_reset_requested')
  async onPasswordResetRequested(
    payload: DomainEventPayload<'auth.password_reset_requested'>,
    eventId: string,
  ): Promise<void> {
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.PasswordReset,
      recipient: payload.email,
      locale: payload.locale,
      data: { resetLink: payload.resetLink, expiresAt: payload.expiresAt },
    });
  }

  @OnDomainEvent('auth.password_changed')
  async onPasswordChanged(
    payload: DomainEventPayload<'auth.password_changed'>,
    eventId: string,
  ): Promise<void> {
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.PasswordChanged,
      recipient: payload.email,
      locale: payload.locale,
      data: {},
    });
  }

  @OnDomainEvent('auth.pending_account_claimed')
  async onPendingAccountClaimed(
    payload: DomainEventPayload<'auth.pending_account_claimed'>,
    eventId: string,
  ): Promise<void> {
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.PendingAccountClaimed,
      recipient: payload.email,
      locale: payload.locale,
      data: {},
    });
  }
}
