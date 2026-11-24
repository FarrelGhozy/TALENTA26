import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  backupObjectStorage,
  type ObjectArchiveClient,
  pruneOldStorageBackups,
  restoreObjectStorage,
} from '../../src/lib/storage-archive';

class FakeArchiveClient implements ObjectArchiveClient {
  readonly buckets = new Map<string, Map<string, { body: Buffer; contentType: string }>>();

  seed(bucket: string, key: string, value: string, contentType: string): void {
    const objects = this.buckets.get(bucket) ?? new Map();
    objects.set(key, { body: Buffer.from(value), contentType });
    this.buckets.set(bucket, objects);
  }

  async listObjects(bucket: string, prefix?: string) {
    return [...(this.buckets.get(bucket) ?? new Map()).entries()]
      .filter(([key]) => !prefix || key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: value.body.byteLength,
        contentType: value.contentType,
      }));
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const value = this.buckets.get(bucket)?.get(key);
    if (!value) throw new Error('missing');
    return value.body;
  }

  async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    const objects = this.buckets.get(bucket) ?? new Map();
    objects.set(key, { body, contentType });
    this.buckets.set(bucket, objects);
  }
}

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('Cadangan dan restore object storage', () => {
  it('memulihkan isi, key, dan content type ke bucket terisolasi', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'talenta-storage-'));
    directories.push(directory);
    const client = new FakeArchiveClient();
    client.seed('sumber', 'evidence/a.pdf', '%PDF-data', 'application/pdf');
    client.seed('sumber', '../key-tidak-aman.png', 'png-data', 'image/png');

    const backup = await backupObjectStorage(client, 'sumber', directory);
    expect(backup.objects).toHaveLength(2);
    await restoreObjectStorage(client, directory, 'restore-uji');

    expect(await client.getObject('restore-uji', 'evidence/a.pdf')).toEqual(
      Buffer.from('%PDF-data')
    );
    expect(
      client.buckets.get('restore-uji')?.get('../key-tidak-aman.png')?.contentType
    ).toBe('image/png');
  });

  it('menolak checksum rusak dan restore ke bucket sumber', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'talenta-storage-'));
    directories.push(directory);
    const client = new FakeArchiveClient();
    client.seed('sumber', 'a.pdf', '%PDF-data', 'application/pdf');
    const backup = await backupObjectStorage(client, 'sumber', directory);

    await expect(
      restoreObjectStorage(client, directory, 'sumber')
    ).rejects.toThrow('bucket terisolasi');

    await writeFile(path.join(directory, backup.objects[0].file), 'rusak');
    await expect(
      restoreObjectStorage(client, directory, 'restore-uji')
    ).rejects.toThrow('Checksum');

    const manifest = JSON.parse(
      await readFile(path.join(directory, 'manifest.json'), 'utf8')
    );
    expect(manifest.sourceBucket).toBe('sumber');
  });

  it('mendukung streaming, melewati NoSuchKey secara aman, dan staging atomik saat direktori baru', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'talenta-storage-parent-'));
    directories.push(parent);
    const targetDir = path.join(parent, 'snapshot-baru');

    const streamClient: ObjectArchiveClient = {
      async listObjects() {
        return [
          { key: 'evidence/ok.pdf', size: 10, contentType: 'application/octet-stream' },
          { key: 'evidence/hilang.pdf', size: 5, contentType: 'application/octet-stream' },
        ];
      },
      async getObject() {
        throw new Error('should use getObjectStream');
      },
      async getObjectStream(_bucket, key) {
        if (key === 'evidence/hilang.pdf') {
          const err = new Error('NoSuchKey');
          err.name = 'NoSuchKey';
          throw err;
        }
        async function* chunks() {
          yield Buffer.from('%PDF-');
          yield Buffer.from('12345');
        }
        return {
          stream: chunks(),
          contentType: 'application/pdf',
          contentLength: 10,
        };
      },
      async putObject() {},
    };

    const manifest = await backupObjectStorage(streamClient, 'sumber', targetDir);
    expect(manifest.objects).toHaveLength(1);
    expect(manifest.objects[0].key).toBe('evidence/ok.pdf');
    expect(manifest.objects[0].contentType).toBe('application/pdf');
    expect(existsSync(path.join(targetDir, 'manifest.json'))).toBe(true);
  });

  it('menghapus hanya direktori backup lama ber-manifest sesuai retensi', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'talenta-prune-'));
    directories.push(parent);

    const oldDir = path.join(parent, '20260101');
    const freshDir = path.join(parent, '20261124');
    const unrelatedDir = path.join(parent, 'catatan-lain');
    await Promise.all([
      mkdir(oldDir, { recursive: true }),
      mkdir(freshDir, { recursive: true }),
      mkdir(unrelatedDir, { recursive: true }),
    ]);

    const oldManifest = path.join(oldDir, 'manifest.json');
    const freshManifest = path.join(freshDir, 'manifest.json');
    await writeFile(oldManifest, '{"version":1,"objects":[]}\n');
    await writeFile(freshManifest, '{"version":1,"objects":[]}\n');
    await writeFile(path.join(unrelatedDir, 'readme.txt'), 'jangan dihapus');

    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await utimes(oldManifest, twentyDaysAgo, twentyDaysAgo);

    const pruned = await pruneOldStorageBackups(parent, 14, freshDir);
    expect(pruned).toBe(1);
    expect(existsSync(oldDir)).toBe(false);
    expect(existsSync(freshDir)).toBe(true);
    expect(existsSync(unrelatedDir)).toBe(true);
  });
});
