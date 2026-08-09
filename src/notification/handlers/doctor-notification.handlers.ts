import { Injectable } from '@nestjs/common';
import { OnDomainEvent } from '@/shared/events/decorators';
import type { DomainEventPayload } from '@/shared/events/registry';
import { SendNotificationService } from '../application';
import { NotificationTypeValue } from '../domain';

/**
 * Turns doctor-context facts into notifications. Thin adapters only; handlers do
 * NOT catch — the events dispatcher owns retry and dead-lettering.
 */
@Injectable()
export class DoctorNotificationHandlers {
  constructor(private readonly sender: SendNotificationService) {}

  @OnDomainEvent('doctor.registered')
  async onDoctorRegistered(
    payload: DomainEventPayload<'doctor.registered'>,
    eventId: string,
  ): Promise<void> {
    // A freshly-registered doctor must verify their email before they can log
    // in, so registration sends the VERIFICATION email — not a welcome.
    //
    // TODO(auth): the real verification link + expiry belong to the auth
    // module's token flow. Once auth emits `auth.email_verification_requested`
    // (which carries the real link), move this there and revert doctor.registered
    // to a welcome (or drop it) so a verification email is never sent twice.
    const verificationLink = `https://app.vitale.dz/verify?token=${payload.credentialId}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.sender.send({
      eventId,
      type: NotificationTypeValue.EmailVerification,
      recipient: payload.email,
      locale: payload.locale,
      data: { verificationLink, expiresAt },
    });
  }

  @OnDomainEvent('doctor.kyc_approved')
  async onKycApproved(
    payload: DomainEventPayload<'doctor.kyc_approved'>,
    eventId: string,
  ): Promise<void> {
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.KycApproved,
      recipient: payload.email,
      locale: payload.locale,
      data: {},
    });
  }

  @OnDomainEvent('doctor.kyc_rejected')
  async onKycRejected(
    payload: DomainEventPayload<'doctor.kyc_rejected'>,
    eventId: string,
  ): Promise<void> {
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.KycRejected,
      recipient: payload.email,
      locale: payload.locale,
      data: { reason: payload.reason },
    });
  }
}
