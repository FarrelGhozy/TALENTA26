import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  backupObjectStorage,
  type ObjectArchiveClient,
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
});
