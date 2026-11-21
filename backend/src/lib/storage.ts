import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { loadConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageFile {
  buffer: Buffer;
  contentType: string;
}

export interface IStorageService {
  uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void>;
  getFile(key: string): Promise<StorageFile>;
  deleteFile(key: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

export class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;

  constructor(endpoint: string, region: string, bucket: string, accessKey: string, secretKey: string, forcePathStyle: boolean) {
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle,
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
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), '.storage');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private resolvePath(key: string): string {
    const safeKey = key.replace(/\.\./g, '');
    const fullPath = path.join(this.baseDir, safeKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return fullPath;
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const filePath = this.resolvePath(key);
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(`${filePath}.meta`, JSON.stringify({ contentType }));
  }

  async getFile(key: string): Promise<StorageFile> {
    const filePath = this.resolvePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    const buffer = fs.readFileSync(filePath);
    let contentType = 'application/octet-stream';
    if (fs.existsSync(`${filePath}.meta`)) {
      try {
        const meta = JSON.parse(fs.readFileSync(`${filePath}.meta`, 'utf-8'));
        if (meta.contentType) contentType = meta.contentType;
      } catch {
        // fallback
      }
    }
    return { buffer, contentType };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(`${filePath}.meta`)) {
      fs.unlinkSync(`${filePath}.meta`);
    }
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
