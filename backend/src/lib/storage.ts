import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { loadConfig } from './config';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';

export interface StorageFile {
  buffer: Buffer;
  contentType: string;
  etag?: string;
}

export interface StorageStreamFile {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
  etag?: string;
}

export interface StorageObjectMeta {
  key: string;
  size: number;
  lastModified: Date;
}

export interface IStorageService {
  uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void>;
  getFile(key: string): Promise<StorageFile>;
  getFileStream(key: string): Promise<StorageStreamFile>;
  deleteFile(key: string): Promise<void>;
  listKeys(prefix: string): Promise<StorageObjectMeta[]>;
  isAvailable(): Promise<boolean>;
}

const DEFAULT_LOCAL_STORAGE_DIR = path.resolve(import.meta.dir, '../../../.storage');

export class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;

  constructor(
    endpoint: string,
    region: string,
    bucket: string,
    accessKey: string,
    secretKey: string,
    forcePathStyle: boolean
  ) {
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5_000,
        requestTimeout: 15_000,
      }),
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  async getFile(key: string): Promise<StorageFile> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    const byteArray = await res.Body?.transformToByteArray();
    if (!byteArray) {
      throw new Error(`File not found: ${key}`);
    }

    return {
      buffer: Buffer.from(byteArray),
      contentType: res.ContentType || 'application/octet-stream',
      etag: res.ETag,
    };
  }

  async getFileStream(key: string): Promise<StorageStreamFile> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!res.Body) {
      throw new Error(`File not found: ${key}`);
    }

    const webStream =
      typeof (res.Body as any).transformToWebStream === 'function'
        ? ((res.Body as any).transformToWebStream() as ReadableStream<Uint8Array>)
        : (Readable.toWeb(res.Body as unknown as Readable) as unknown as ReadableStream<Uint8Array>);

    return {
      stream: webStream,
      contentType: res.ContentType || 'application/octet-stream',
      contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : undefined,
      etag: res.ETag,
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async listKeys(prefix: string): Promise<StorageObjectMeta[]> {
    const items: StorageObjectMeta[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        })
      );

      for (const obj of res.Contents || []) {
        if (!obj.Key) continue;
        items.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? new Date(0),
        });
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return items;
  }
}

export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || process.env.LOCAL_STORAGE_DIR || DEFAULT_LOCAL_STORAGE_DIR);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private resolveSafePath(key: string): string {
    if (!key || typeof key !== 'string' || key.includes('\0')) {
      throw new Error('Kunci penyimpanan tidak valid');
    }
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.split('/').some((seg) => seg === '..' || seg === '.')) {
      throw new Error('Path traversal terdeteksi pada kunci penyimpanan');
    }
    const resolved = path.resolve(this.baseDir, normalized);
    if (!resolved.startsWith(this.baseDir + path.sep)) {
      throw new Error('Kunci penyimpanan di luar direktori penyimpanan yang diizinkan');
    }
    return resolved;
  }

  private async readContentType(filePath: string): Promise<string> {
    try {
      const raw = await fsp.readFile(`${filePath}.meta`, 'utf-8');
      const meta = JSON.parse(raw);
      if (typeof meta?.contentType === 'string' && meta.contentType) {
        return meta.contentType;
      }
    } catch {
      // fallback default content-type
    }
    return 'application/octet-stream';
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, buffer);
    await fsp.writeFile(`${filePath}.meta`, JSON.stringify({ contentType }));
  }

  async getFile(key: string): Promise<StorageFile> {
    const filePath = this.resolveSafePath(key);
    let stat: fs.Stats;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      throw new Error(`File not found: ${key}`);
    }
    if (!stat.isFile()) {
      throw new Error(`File not found: ${key}`);
    }
    const [buffer, contentType] = await Promise.all([
      fsp.readFile(filePath),
      this.readContentType(filePath),
    ]);
    const etag = `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    return { buffer, contentType, etag };
  }

  async getFileStream(key: string): Promise<StorageStreamFile> {
    const filePath = this.resolveSafePath(key);
    let stat: fs.Stats;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      throw new Error(`File not found: ${key}`);
    }
    if (!stat.isFile()) {
      throw new Error(`File not found: ${key}`);
    }
    const contentType = await this.readContentType(filePath);
    const etag = `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    const nodeStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

    return {
      stream: webStream,
      contentType,
      contentLength: stat.size,
      etag,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    await fsp.unlink(filePath).catch(() => {});
    await fsp.unlink(`${filePath}.meta`).catch(() => {});
  }

  async listKeys(prefix: string): Promise<StorageObjectMeta[]> {
    const cleanPrefix = prefix.replace(/\\/g, '/').replace(/^\/+/, '');
    const results: StorageObjectMeta[] = [];

    const walk = async (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
          const relKey = path.relative(this.baseDir, fullPath).split(path.sep).join('/');
          if (!cleanPrefix || relKey.startsWith(cleanPrefix)) {
            try {
              const stat = await fsp.stat(fullPath);
              results.push({
                key: relKey,
                size: stat.size,
                lastModified: stat.mtime,
              });
            } catch {
              // skip files deleted concurrently
            }
          }
        }
      }
    };

    await walk(this.baseDir);
    return results;
  }
}

let storageInstance: IStorageService | null = null;
let storageDriverLabel: string | null = null;

export function getStorageDriverName(): string {
  if (storageDriverLabel) return storageDriverLabel;
  const conf = loadConfig();
  const hasS3 =
    Boolean(conf.s3.endpoint) &&
    Boolean(conf.s3.accessKey) &&
    Boolean(conf.s3.secretKey) &&
    Boolean(conf.s3.bucket) &&
    !conf.s3.accessKey!.startsWith('change-with-') &&
    !conf.s3.secretKey!.startsWith('change-with-');
  return hasS3 ? 'RustFS (S3-Compatible)' : 'Local Filesystem (.storage)';
}

export function getStorageService(): IStorageService {
  if (storageInstance) return storageInstance;

  const conf = loadConfig();
  const hasValidS3 =
    Boolean(conf.s3.endpoint) &&
    Boolean(conf.s3.accessKey) &&
    Boolean(conf.s3.secretKey) &&
    Boolean(conf.s3.bucket) &&
    !conf.s3.accessKey!.startsWith('change-with-') &&
    !conf.s3.secretKey!.startsWith('change-with-');

  if (hasValidS3) {
    storageInstance = new S3StorageService(
      conf.s3.endpoint!,
      conf.s3.region,
      conf.s3.bucket,
      conf.s3.accessKey!,
      conf.s3.secretKey!,
      conf.s3.forcePathStyle
    );
    storageDriverLabel = 'RustFS (S3-Compatible)';
  } else {
    if (conf.nodeEnv === 'production') {
      throw new Error(
        'Konfigurasi S3/RustFS wajib lengkap di lingkungan produksi. Fallback storage lokal dinonaktifkan.'
      );
    }
    storageInstance = new LocalStorageService();
    storageDriverLabel = 'Local Filesystem (.storage)';
  }

  return storageInstance;
}
