import { Notification } from '../domain';

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  /** The idempotency lookup: one delivery per (event, type, channel). */
  findByEventAndType(
    eventId: string,
    type: string,
    channel: string,
  ): Promise<Notification | null>;
  findFailed(limit: number): Promise<Notification[]>;
}

export const INotificationRepository = Symbol('INotificationRepository');
