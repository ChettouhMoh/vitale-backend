import { Injectable } from '@nestjs/common';
import { OutboxEvent } from '@/shared/events/domain';
import { IOutboxRepository } from '@/shared/events/ports';

/**
 * In-memory transactional outbox. A real adapter (SQL) would write the row in
 * the SAME transaction as the state change; here it's a plain Map. Note that
 * this table is SENSITIVE — payloads carry one-time tokens (see the events
 * module security notes) — which is why published rows are deleted, not kept.
 */
@Injectable()
export class InMemoryOutboxRepository implements IOutboxRepository {
  private readonly store = new Map<string, OutboxEvent>();

  async save(event: OutboxEvent): Promise<void> {
    this.store.set(event.id, event);
  }

  async findDue(limit: number, now: Date): Promise<OutboxEvent[]> {
    return Array.from(this.store.values())
      .filter((e) => e.isDue(now))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()) // FIFO
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async findDeadLettered(limit: number): Promise<OutboxEvent[]> {
    return Array.from(this.store.values())
      .filter((e) => e.isDeadLettered)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit);
  }

  async purgeDeadLetteredOlderThan(date: Date): Promise<number> {
    let purged = 0;
    for (const [id, event] of this.store) {
      const dl = event.deadLetteredAt;
      if (dl && dl.getTime() < date.getTime()) {
        this.store.delete(id);
        purged += 1;
      }
    }
    return purged;
  }
}
