const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_SECONDS = 2;
const JITTER_RATIO = 0.2; // ±20%

/**
 * RetrySchedule — owns the backoff policy for a failed outbox event.
 *
 * Exponential backoff on the base delay (2s → 4s → 8s → 16s → 32s for attempts
 * 1..5), each with ±20% random jitter to avoid a thundering herd of retries
 * landing at the same instant. `nextAttemptAfter` returns `null` once the
 * attempt count exceeds the maximum — the dispatcher reads that as "dead-letter".
 */
export class RetrySchedule {
  private constructor(
    private readonly maxAttempts: number,
    private readonly baseSeconds: number,
  ) {}

  static create(
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    baseSeconds: number = DEFAULT_BASE_SECONDS,
  ): RetrySchedule {
    return new RetrySchedule(
      Math.max(1, Math.floor(maxAttempts)),
      Math.max(0, baseSeconds),
    );
  }

  static default(): RetrySchedule {
    return RetrySchedule.create();
  }

  get max(): number {
    return this.maxAttempts;
  }

  /**
   * @param attempts the failure count AFTER incrementing (1 = first failure).
   * @returns when to try next, or `null` once attempts exceed the maximum.
   */
  nextAttemptAfter(attempts: number): Date | null {
    if (attempts > this.maxAttempts) {
      return null; // exhausted → dead-letter
    }
    const backoffSeconds = this.baseSeconds * 2 ** (attempts - 1);
    const jitter = 1 + (Math.random() * 2 - 1) * JITTER_RATIO; // [0.8, 1.2]
    const delayMs = Math.round(backoffSeconds * jitter * 1000);
    return new Date(Date.now() + delayMs);
  }
}
