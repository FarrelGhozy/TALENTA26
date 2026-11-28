import { RateLimitError } from './error';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;
  private readonly customMessage?: string;

  constructor(
    maxRequests = 10,
    windowMs = 60 * 1000,
    options?: { maxEntries?: number; message?: string }
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxEntries = Math.max(100, options?.maxEntries ?? 10_000);
    this.customMessage = options?.message;

    // Bersihkan entri kedaluwarsa secara periodik setiap 30 detik agar RAM tetap kecil
    setInterval(() => this.cleanup(), 30 * 1000).unref();
  }

  public check(key: string): RateLimitResult {
    // Izinkan bypass eksplisit hanya saat NODE_ENV=test bila diaktifkan
    if (process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_DISABLED === 'true') {
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests,
        resetSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    const now = Date.now();
    const safeKey = key.length > 160 ? key.slice(0, 160) : key;
    const record = this.records.get(safeKey);

    if (!record || record.resetAt <= now) {
      if (!record && this.records.size >= this.maxEntries) {
        this.evictIfFull(now);
      }
      const resetAt = now + this.windowMs;
      this.records.set(safeKey, { count: 1, resetAt });
      return {
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - 1),
        resetSeconds: Math.max(1, Math.ceil(this.windowMs / 1000)),
      };
    }

    // Refresh urutan LRU dengan menghapus dan memasukkan kembali
    this.records.delete(safeKey);
    this.records.set(safeKey, record);

    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    if (record.count >= this.maxRequests) {
      throw new RateLimitError(
        this.customMessage ||
          `Terlalu banyak permintaan. Silakan coba kembali dalam ${retryAfterSeconds} detik.`,
        retryAfterSeconds
      );
    }

    record.count += 1;
    return {
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - record.count),
      resetSeconds: retryAfterSeconds,
    };
  }

  public reset(key: string): void {
    this.records.delete(key);
  }

  public clear(): void {
    this.records.clear();
  }

  public get size(): number {
    return this.records.size;
  }

  private evictIfFull(now: number): void {
    // 1. Bersihkan entri yang sudah kedaluwarsa terlebih dahulu
    for (const [k, rec] of this.records.entries()) {
      if (rec.resetAt <= now) {
        this.records.delete(k);
      }
      if (this.records.size < this.maxEntries) return;
    }

    // 2. Jika masih penuh (misal serangan IP acak), eviksi 10% entri terlama (LRU)
    const toRemove = Math.max(1, Math.floor(this.maxEntries * 0.1));
    let removed = 0;
    for (const k of this.records.keys()) {
      this.records.delete(k);
      removed += 1;
      if (removed >= toRemove) break;
    }
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

export function applyRateLimitHeaders(
  headersTarget: Record<string, string | number>,
  result: RateLimitResult
): void {
  headersTarget['x-ratelimit-limit'] = String(result.limit);
  headersTarget['x-ratelimit-remaining'] = String(result.remaining);
  headersTarget['x-ratelimit-reset'] = String(result.resetSeconds);
}

// Preset berjenjang ramah NAT kampus (IP + akun/email/userId); batas khusus auth/upload/mutasi/ekspor tetap ketat
export const globalApiLimiter = new InMemoryRateLimiter(600, 60 * 1000, {
  maxEntries: 15_000,
});

export const authRateLimiter = new InMemoryRateLimiter(30, 60 * 1000, {
  maxEntries: 10_000,
  message: 'Terlalu banyak percobaan autentikasi dari jaringan Anda. Coba lagi sebentar lagi.',
});

export const authLoginEmailLimiter = new InMemoryRateLimiter(8, 15 * 60 * 1000, {
  maxEntries: 10_000,
  message: 'Terlalu banyak percobaan masuk untuk akun ini. Silakan tunggu beberapa menit.',
});

export const authRegisterIpLimiter = new InMemoryRateLimiter(10, 15 * 60 * 1000, {
  maxEntries: 10_000,
  message: 'Terlalu banyak pendaftaran dari alamat IP ini. Silakan tunggu beberapa menit.',
});

export const authForgotEmailLimiter = new InMemoryRateLimiter(3, 15 * 60 * 1000, {
  maxEntries: 10_000,
  message: 'Permintaan pemulihan kata sandi terlalu sering untuk email ini. Coba lagi nanti.',
});

export const uploadUserLimiter = new InMemoryRateLimiter(15, 10 * 60 * 1000, {
  maxEntries: 10_000,
  message: 'Batas unggah berkas tercapai. Silakan tunggu beberapa menit sebelum mengunggah lagi.',
});

export const uploadIpLimiter = new InMemoryRateLimiter(30, 10 * 60 * 1000, {
  maxEntries: 10_000,
  message: 'Terlalu banyak aktivitas unggah dari jaringan Anda. Silakan tunggu beberapa menit.',
});

export const joinCodeUserLimiter = new InMemoryRateLimiter(10, 10 * 60 * 1000, {
  maxEntries: 10_000,
  message: 'Terlalu banyak percobaan kode undangan tim. Silakan tunggu beberapa menit.',
});

export const heavyExportUserLimiter = new InMemoryRateLimiter(5, 5 * 60 * 1000, {
  maxEntries: 5_000,
  message: 'Terlalu banyak permintaan ekspor CSV. Silakan tunggu beberapa menit.',
});

export const mutationUserLimiter = new InMemoryRateLimiter(60, 60 * 1000, {
  maxEntries: 10_000,
});

export const healthReadyIpLimiter = new InMemoryRateLimiter(15, 60 * 1000, {
  maxEntries: 5_000,
});

/**
 * Mengosongkan seluruh bucket rate limiter singleton.
 * Digunakan oleh harness uji integrasi multi-file agar akumulasi permintaan antar suite
 * tidak saling memicu 429 palsu saat berjalan dalam satu proses (`bun run test:coverage`).
 */
export function resetAllRateLimiters(): void {
  globalApiLimiter.clear();
  authRateLimiter.clear();
  authLoginEmailLimiter.clear();
  authRegisterIpLimiter.clear();
  authForgotEmailLimiter.clear();
  uploadUserLimiter.clear();
  uploadIpLimiter.clear();
  joinCodeUserLimiter.clear();
  heavyExportUserLimiter.clear();
  mutationUserLimiter.clear();
  healthReadyIpLimiter.clear();
}
