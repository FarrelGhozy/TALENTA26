interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache baca in-memory berkapasitas terbatas (LRU + TTL pendek) untuk meringankan beban MySQL
 * pada endpoint publik yang sering dibaca (ranking, katalog kompetisi, periode akademik aktif).
 */
export class BoundedReadCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(options: { maxEntries?: number; defaultTtlMs?: number } = {}) {
    this.maxEntries = Math.max(10, options.maxEntries ?? 200);
    this.defaultTtlMs = Math.max(1000, options.defaultTtlMs ?? 30_000);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Promosikan ke posisi paling baru (LRU)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    const now = Date.now();
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      this.evictExpired(now);
      while (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey === undefined) break;
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: now + Math.max(1000, ttlMs) });
  }

  async getOrSet<T>(key: string, loader: () => Promise<T>, ttlMs = this.defaultTtlMs): Promise<T> {
    if (process.env.NODE_ENV === 'test' && process.env.READ_CACHE_ENABLED !== 'true') {
      return loader();
    }
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    const fresh = await loader();
    this.set(key, fresh, ttlMs);
    return fresh;
  }

  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evictExpired(now: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

export const appReadCache = new BoundedReadCache({
  maxEntries: 200,
  defaultTtlMs: 30_000,
});

export function invalidateRankingCache(): void {
  appReadCache.invalidatePrefix('ranking:');
}

export function invalidateCompetitionCache(): void {
  appReadCache.invalidatePrefix('competitions:');
}

export function invalidatePeriodCache(): void {
  appReadCache.invalidatePrefix('period:');
  appReadCache.invalidatePrefix('ranking:');
}
