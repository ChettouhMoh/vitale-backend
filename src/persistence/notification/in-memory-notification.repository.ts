import { Injectable } from '@nestjs/common';
import { Notification } from '@/notification/domain';
import { INotificationRepository } from '@/notification/ports';

@Injectable()
export class InMemoryNotificationRepository
  implements INotificationRepository
{
  private readonly store = new Map<string, Notification>();

  async save(notification: Notification): Promise<void> {
    this.store.set(notification.id, notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.store.get(id) ?? null;
  }

  async findByEventAndType(
    eventId: string,
    type: string,
    channel: string,
  ): Promise<Notification | null> {
    for (const n of this.store.values()) {
      if (n.eventId === eventId && n.type === type && n.channel === channel) {
        return n;
      }
    }
    return null;
  }

  async findFailed(limit: number): Promise<Notification[]> {
    return Array.from(this.store.values())
      .filter((n) => n.isFailed)
      .slice(0, limit);
  }
}
