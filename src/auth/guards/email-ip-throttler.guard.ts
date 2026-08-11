import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface ThrottledRequest {
  ip?: string;
  ips?: string[];
  body?: { email?: unknown };
}

/**
 * Rate-limit key = client IP + submitted email. Login and the account-recovery
 * endpoints must be limited per (IP, email) so neither a single IP spraying
 * many emails nor many IPs hammering one email slips past a purely IP-based
 * limit. Applied via `@UseGuards` + `@Throttle` on the sensitive endpoints only.
 */
@Injectable()
export class EmailIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: ThrottledRequest): Promise<string> {
    const ip = req.ips && req.ips.length > 0 ? req.ips[0] : (req.ip ?? 'unknown');
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'anonymous';
    return Promise.resolve(`${ip}:${email}`);
  }
}
