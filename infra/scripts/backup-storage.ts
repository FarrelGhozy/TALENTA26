#!/usr/bin/env bun
import { S3Client } from '@aws-sdk/client-s3';
import {
  backupObjectStorage,
  restoreObjectStorage,
  S3ObjectArchiveClient,
} from '../../backend/src/lib/storage-archive';
import { loadConfig } from '../../backend/src/lib/config';

function valueAfter(name: string): string | undefined {
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
}

function usage(): never {
  console.error(
    'Penggunaan:\n' +
      '  bun infra/scripts/backup-storage.ts backup --output <direktori> [--prefix <prefix>]\n' +
      '  bun infra/scripts/backup-storage.ts restore --input <direktori> --target-bucket <bucket-uji>'
  );
  process.exit(1);
}

const mode = Bun.argv[2];
const config = loadConfig();
if (
  !config.s3.endpoint ||
  !config.s3.accessKey ||
  !config.s3.secretKey ||
  !config.s3.bucket
) {
  throw new Error('Konfigurasi S3/RustFS belum lengkap.');
}

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: config.s3.forcePathStyle,
});
const client = new S3ObjectArchiveClient(s3);

if (mode === 'backup') {
  const output = valueAfter('--output');
  if (!output) usage();
  const manifest = await backupObjectStorage(
    client,
    config.s3.bucket,
    output,
    valueAfter('--prefix')
  );
  console.log(`Cadangan selesai: ${manifest.objects.length} objek.`);
} else if (mode === 'restore') {
  const input = valueAfter('--input');
  const targetBucket = valueAfter('--target-bucket');
  if (!input || !targetBucket) usage();
  const manifest = await restoreObjectStorage(client, input, targetBucket);
  console.log(`Restore selesai: ${manifest.objects.length} objek.`);
} else {
  usage();
}
