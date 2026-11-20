import { RateLimitError } from './error';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Bersihkan entri kedaluwarsa secara periodik setiap 5 menit
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  public check(key: string): void {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || record.resetAt <= now) {
      this.records.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return;
    }

    if (record.count >= this.maxRequests) {
      throw new RateLimitError();
    }

    record.count += 1;
  }

  public reset(key: string): void {
    this.records.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.resetAt <= now) {
        this.records.delete(key);
      }
    }
  }
}

export const authRateLimiter = new InMemoryRateLimiter(15, 60 * 1000); // 15 percobaan per menit per IP
