import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface ArchiveObject {
  key: string;
  size: number;
  contentType: string;
}

export interface ObjectArchiveClient {
  listObjects(bucket: string, prefix?: string): Promise<ArchiveObject[]>;
  getObject(bucket: string, key: string): Promise<Buffer>;
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
        const response = await this.client.send(
          new GetObjectCommand({ Bucket: bucket, Key: object.Key })
        );
        objects.push({
          key: object.Key,
          size: object.Size ?? 0,
          contentType: response.ContentType ?? 'application/octet-stream',
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

export async function backupObjectStorage(
  client: ObjectArchiveClient,
  sourceBucket: string,
  outputDirectory: string,
  prefix?: string
): Promise<ArchiveManifest> {
  const objectDirectory = path.join(outputDirectory, 'objects');
  await mkdir(objectDirectory, { recursive: true });

  const listedObjects = await client.listObjects(sourceBucket, prefix);
  const objects: ArchiveManifestObject[] = [];

  for (const object of listedObjects) {
    const body = await client.getObject(sourceBucket, object.key);
    if (body.byteLength !== object.size) {
      throw new Error(`Ukuran objek berubah saat dicadangkan: ${object.key}`);
    }

    const file = path.posix.join('objects', sha256(object.key));
    await writeFile(path.join(outputDirectory, file), body, { flag: 'wx' });
    objects.push({
      ...object,
      file,
      sha256: sha256(body),
    });
  }

  const manifest: ArchiveManifest = {
    version: 1,
    sourceBucket,
    createdAt: new Date().toISOString(),
    objects,
  };
  await writeFile(
    path.join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: 'wx' }
  );
  return manifest;
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
