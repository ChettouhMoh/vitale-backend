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
    // Now that the auth module owns the token flow, the VERIFICATION email is
    // driven by `auth.email_verification_requested` (which carries the real,
    // signed link). So `doctor.registered` sends only a WELCOME — sending a
    // verification here too would deliver two emails per signup. OAuth signups
    // also emit `doctor.registered` but are already verified, so a welcome is
    // exactly right for them.
    await this.sender.send({
      eventId,
      type: NotificationTypeValue.DoctorWelcome,
      recipient: payload.email,
      locale: payload.locale,
      data: { fullName: payload.fullName },
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
