import { describe, expect, it } from '@jest/globals';
import { RetrySchedule } from './retry-schedule.vo';

describe('RetrySchedule', () => {
  const BASE = 2;
  const MAX = 5;
  const schedule = RetrySchedule.create(MAX, BASE);

  it('backs off exponentially within the ±20% jitter band for attempts 1..max', () => {
    for (let attempt = 1; attempt <= MAX; attempt++) {
      const before = Date.now();
      const next = schedule.nextAttemptAfter(attempt);
      expect(next).not.toBeNull();

      const delayMs = (next as Date).getTime() - before;
      const expected = BASE * 2 ** (attempt - 1) * 1000;
      // ±20% jitter, plus a small allowance for elapsed time in the assertion.
      expect(delayMs).toBeGreaterThanOrEqual(expected * 0.8 - 50);
      expect(delayMs).toBeLessThanOrEqual(expected * 1.2 + 50);
    }
  });

  it('returns null once attempts exceed the maximum (dead-letter signal)', () => {
    expect(schedule.nextAttemptAfter(MAX + 1)).toBeNull();
    expect(schedule.nextAttemptAfter(MAX + 5)).toBeNull();
  });

  it('exposes its configured maximum', () => {
    expect(RetrySchedule.create(3, 2).max).toBe(3);
    expect(RetrySchedule.default().max).toBe(5);
  });
});
