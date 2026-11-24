import { describe, expect, it, afterAll } from 'bun:test';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { LocalStorageService } from '../../src/lib/storage';
import { BoundedReadCache } from '../../src/lib/cache';

describe('Wave 3 Unit — LocalStorageService Path Safety, Streaming, ETag & BoundedReadCache', () => {
  const tempDir = path.join(os.tmpdir(), `talenta-storage-unit-${Date.now()}`);

  afterAll(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  it('menolak path traversal dan null byte pada LocalStorageService', async () => {
    const storage = new LocalStorageService(tempDir);

    await expect(storage.uploadFile('../escape.txt', Buffer.from('x'), 'text/plain')).rejects.toThrow();
    await expect(storage.uploadFile('a/../../escape.txt', Buffer.from('x'), 'text/plain')).rejects.toThrow();
    await expect(storage.uploadFile('bad\0key.pdf', Buffer.from('x'), 'application/pdf')).rejects.toThrow();
    await expect(storage.getFile('../escape.txt')).rejects.toThrow();
    await expect(storage.deleteFile('../escape.txt')).rejects.toThrow();
  });

  it('mendukung upload async, getFileStream + ETag, listKeys(prefix) tanpa .meta, dan deleteFile bersih', async () => {
    const storage = new LocalStorageService(tempDir);
    const key1 = 'institutions/inst-a/achievements/ach-1/bukti.pdf';
    const key2 = 'institutions/inst-a/avatars/u-1/foto.png';
    const payload = Buffer.from('%PDF-1.4 sample content stream');

    await storage.uploadFile(key1, payload, 'application/pdf');
    await storage.uploadFile(key2, Buffer.from('PNGDATA'), 'image/png');

    const streamRes = await storage.getFileStream(key1);
    expect(streamRes.contentType).toBe('application/pdf');
    expect(streamRes.contentLength).toBe(payload.byteLength);
    expect(streamRes.etag).toBeTruthy();

    const chunks: Uint8Array[] = [];
    const reader = streamRes.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    expect(Buffer.concat(chunks).toString('utf8')).toBe(payload.toString('utf8'));

    const listedAll = await storage.listKeys('institutions/inst-a/');
    expect(listedAll.map((o) => o.key).sort()).toEqual([key1, key2].sort());
    expect(listedAll.every((o) => !o.key.endsWith('.meta'))).toBe(true);

    const listedAch = await storage.listKeys('institutions/inst-a/achievements/');
    expect(listedAch.map((o) => o.key)).toEqual([key1]);

    await storage.deleteFile(key1);
    const listedAfterDelete = await storage.listKeys('institutions/inst-a/');
    expect(listedAfterDelete.map((o) => o.key)).toEqual([key2]);
    await expect(storage.getFileStream(key1)).rejects.toThrow();
  });

  it('BoundedReadCache membatasi jumlah entri (LRU), menghormati TTL, dan mendukung invalidatePrefix', async () => {
    const cache = new BoundedReadCache({ maxEntries: 10, defaultTtlMs: 1000 });

    for (let i = 0; i < 15; i++) {
      cache.set(`ranking:k${i}`, i);
    }
    expect(cache.size).toBe(10);
    // 5 kunci tertua harus tereviksi
    expect(cache.get('ranking:k0')).toBeUndefined();
    expect(cache.get('ranking:k14')).toBe(14);

    cache.set('competitions:list', ['a', 'b']);
    const removed = cache.invalidatePrefix('ranking:');
    expect(removed).toBeGreaterThan(0);
    expect(cache.get('ranking:k14')).toBeUndefined();
    expect(cache.get<string[]>('competitions:list')).toEqual(['a', 'b']);
  });
});
