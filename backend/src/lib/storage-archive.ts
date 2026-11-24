import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

export interface ArchiveObject {
  key: string;
  size: number;
  contentType: string;
}

export interface ArchiveObjectStreamResult {
  stream: AsyncIterable<Uint8Array>;
  contentType?: string;
  contentLength?: number;
}

export interface ObjectArchiveClient {
  listObjects(bucket: string, prefix?: string): Promise<ArchiveObject[]>;
  getObject(bucket: string, key: string): Promise<Buffer>;
  getObjectStream?(bucket: string, key: string): Promise<ArchiveObjectStreamResult>;
  putObject(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void>;
}

interface ArchiveManifestObject extends ArchiveObject {
  file: string;
  sha256: string;
}

export interface ArchiveManifest {
  version: 1;
  sourceBucket: string;
  createdAt: string;
  objects: ArchiveManifestObject[];
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    e.name === 'NoSuchKey' ||
    e.name === 'NotFound' ||
    e.Code === 'NoSuchKey' ||
    e.code === 'NoSuchKey' ||
    e.$metadata?.httpStatusCode === 404
  );
}

export class S3ObjectArchiveClient implements ObjectArchiveClient {
  constructor(private readonly client: S3Client) {}

  async listObjects(bucket: string, prefix?: string): Promise<ArchiveObject[]> {
    const objects: ArchiveObject[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      for (const object of result.Contents ?? []) {
        if (!object.Key) continue;
        // Tidak lagi melakukan N+1 HeadObjectCommand; ContentType & ContentLength final
        // diambil langsung dari respons GetObjectCommand saat proses pengunduhan streaming.
        objects.push({
          key: object.Key,
          size: object.Size ?? 0,
          contentType: 'application/octet-stream',
        });
      }

      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return objects;
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Objek tidak dapat dibaca: ${key}`);
    return Buffer.from(bytes);
  }

  async getObjectStream(
    bucket: string,
    key: string
  ): Promise<ArchiveObjectStreamResult> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const body = result.Body as AsyncIterable<Uint8Array> | undefined;
    if (!body || typeof body[Symbol.asyncIterator] !== 'function') {
      throw new Error(`Stream objek tidak dapat dibaca: ${key}`);
    }
    return {
      stream: body,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }
}

async function streamObjectToFile(
  stream: AsyncIterable<Uint8Array>,
  targetPath: string
): Promise<{ size: number; digest: string }> {
  const hash = createHash('sha256');
  const writer = createWriteStream(targetPath, { flags: 'wx', mode: 0o600 });
  let totalBytes = 0;

  try {
    for await (const rawChunk of stream) {
      const chunk = rawChunk instanceof Uint8Array ? rawChunk : Buffer.from(rawChunk);
      totalBytes += chunk.byteLength;
      hash.update(chunk);

      if (!writer.write(chunk)) {
        await new Promise<void>((resolve, reject) => {
          const onDrain = () => {
            writer.off('error', onError);
            resolve();
          };
          const onError = (err: Error) => {
            writer.off('drain', onDrain);
            reject(err);
          };
          writer.once('drain', onDrain);
          writer.once('error', onError);
        });
      }
    }

    await new Promise<void>((resolve, reject) => {
      writer.once('error', reject);
      writer.end(() => resolve());
    });

    return { size: totalBytes, digest: hash.digest('hex') };
  } catch (err) {
    writer.destroy();
    await rm(targetPath, { force: true }).catch(() => {});
    throw err;
  }
}

export async function backupObjectStorage(
  client: ObjectArchiveClient,
  sourceBucket: string,
  outputDirectory: string,
  prefix?: string
): Promise<ArchiveManifest> {
  const resolvedOut = path.resolve(outputDirectory);
  const parentDir = path.dirname(resolvedOut);
  const baseName = path.basename(resolvedOut);

  let outputExists = false;
  try {
    const existing = await stat(resolvedOut);
    if (!existing.isDirectory()) {
      throw new Error(`Target output bukan direktori: ${resolvedOut}`);
    }
    const entries = await readdir(resolvedOut);
    if (entries.length > 0) {
      throw new Error(`Direktori output cadangan sudah terisi: ${resolvedOut}`);
    }
    outputExists = true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw err;
    }
  }

  await mkdir(parentDir, { recursive: true, mode: 0o700 });
  const stagingDirectory = path.join(
    parentDir,
    `.${baseName}.tmp-${process.pid}-${Date.now()}`
  );
  const stagingObjectsDir = path.join(stagingDirectory, 'objects');
  await mkdir(stagingObjectsDir, { recursive: true, mode: 0o700 });

  try {
    const listedObjects = await client.listObjects(sourceBucket, prefix);
    const objects: ArchiveManifestObject[] = [];

    for (const object of listedObjects) {
      const file = path.posix.join('objects', sha256(object.key));
      const targetPath = path.join(stagingDirectory, file);

      if (client.getObjectStream) {
        let streamed: ArchiveObjectStreamResult;
        try {
          streamed = await client.getObjectStream(sourceBucket, object.key);
        } catch (err) {
          if (isNotFoundError(err)) {
            console.warn(
              `[WARN] Objek dihapus sebelum sempat dicadangkan, dilewati: ${object.key}`
            );
            continue;
          }
          throw err;
        }

        const { size, digest } = await streamObjectToFile(streamed.stream, targetPath);
        const expectedSize = streamed.contentLength ?? object.size;
        if (expectedSize > 0 && size !== expectedSize) {
          throw new Error(`Ukuran objek berubah saat dicadangkan: ${object.key}`);
        }
        objects.push({
          key: object.key,
          size,
          contentType: streamed.contentType || object.contentType || 'application/octet-stream',
          file,
          sha256: digest,
        });
      } else {
        let body: Buffer;
        try {
          body = await client.getObject(sourceBucket, object.key);
        } catch (err) {
          if (isNotFoundError(err)) {
            console.warn(
              `[WARN] Objek dihapus sebelum sempat dicadangkan, dilewati: ${object.key}`
            );
            continue;
          }
          throw err;
        }

        if (body.byteLength !== object.size) {
          throw new Error(`Ukuran objek berubah saat dicadangkan: ${object.key}`);
        }
        await writeFile(targetPath, body, { flag: 'wx', mode: 0o600 });
        objects.push({
          ...object,
          file,
          sha256: sha256(body),
        });
      }
    }

    const manifest: ArchiveManifest = {
      version: 1,
      sourceBucket,
      createdAt: new Date().toISOString(),
      objects,
    };
    await writeFile(
      path.join(stagingDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: 'wx', mode: 0o600 }
    );

    if (outputExists) {
      // Direktori target sudah dibuat kosong sebelumnya (mis. mkdtemp); pindahkan isi secara atomik
      await chmod(resolvedOut, 0o700).catch(() => {});
      await rename(stagingObjectsDir, path.join(resolvedOut, 'objects'));
      await rename(
        path.join(stagingDirectory, 'manifest.json'),
        path.join(resolvedOut, 'manifest.json')
      );
      await rm(stagingDirectory, { recursive: true, force: true });
    } else {
      await rename(stagingDirectory, resolvedOut);
    }

    return manifest;
  } catch (err) {
    await rm(stagingDirectory, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

export async function restoreObjectStorage(
  client: ObjectArchiveClient,
  inputDirectory: string,
  targetBucket: string
): Promise<ArchiveManifest> {
  const manifestPath = path.join(inputDirectory, 'manifest.json');
  const manifest = JSON.parse(
    await readFile(manifestPath, 'utf8')
  ) as ArchiveManifest;

  if (manifest.version !== 1 || !Array.isArray(manifest.objects)) {
    throw new Error('Manifest cadangan storage tidak didukung.');
  }
  if (targetBucket === manifest.sourceBucket) {
    throw new Error('Restore wajib diarahkan ke bucket terisolasi.');
  }

  for (const object of manifest.objects) {
    const expectedFile = path.posix.join('objects', sha256(object.key));
    if (object.file !== expectedFile) {
      throw new Error(`Path arsip tidak valid untuk objek: ${object.key}`);
    }

    const body = await readFile(path.join(inputDirectory, object.file));
    if (body.byteLength !== object.size || sha256(body) !== object.sha256) {
      throw new Error(`Checksum objek tidak cocok: ${object.key}`);
    }
    await client.putObject(
      targetBucket,
      object.key,
      body,
      object.contentType
    );
  }

  return manifest;
}

/**
 * Menghapus direktori backup storage lama (yang memuat manifest.json) di bawah `parentDir`
 * bila lebih tua dari `keepDays` hari agar disk home server tidak penuh.
 */
export async function pruneOldStorageBackups(
  parentDir: string,
  keepDays: number,
  excludeDir?: string
): Promise<number> {
  if (keepDays <= 0) return 0;

  const resolvedParent = path.resolve(parentDir);
  const resolvedExclude = excludeDir ? path.resolve(excludeDir) : null;
  const cutoffMs = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  let pruned = 0;

  let entries;
  try {
    entries = await readdir(resolvedParent, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const candidate = path.join(resolvedParent, entry.name);
    if (resolvedExclude && path.resolve(candidate) === resolvedExclude) continue;

    const manifestPath = path.join(candidate, 'manifest.json');
    try {
      const mStat = await stat(manifestPath);
      if (mStat.mtimeMs < cutoffMs) {
        await rm(candidate, { recursive: true, force: true });
        pruned += 1;
      }
    } catch {
      // Bukan direktori backup storage ber-manifest — lewati dengan aman
    }
  }

  return pruned;
}
