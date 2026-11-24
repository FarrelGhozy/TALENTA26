#!/usr/bin/env bun
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { existsSync, readFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import path from 'node:path';
import {
  backupObjectStorage,
  pruneOldStorageBackups,
  restoreObjectStorage,
  S3ObjectArchiveClient,
} from '../../backend/src/lib/storage-archive';
import { loadConfig } from '../../backend/src/lib/config';

const SCRIPT_DIR = path.dirname(Bun.main);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..');

function valueAfter(name: string): string | undefined {
  const index = Bun.argv.indexOf(name);
  if (index < 0 || index + 1 >= Bun.argv.length) return undefined;
  return Bun.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return Bun.argv.includes(name);
}

function usage(exitCode = 1): never {
  const text =
    'Penggunaan:\n' +
    '  bun infra/scripts/backup-storage.ts backup --output <direktori> [--prefix <prefix>] [--env-file <path>] [--keep-days <hari>]\n' +
    '  bun infra/scripts/backup-storage.ts restore --input <direktori> --target-bucket <bucket-uji> [--env-file <path>]\n' +
    '  bun infra/scripts/backup-storage.ts --help';
  if (exitCode === 0) {
    console.log(text);
  } else {
    console.error(text);
  }
  process.exit(exitCode);
}

function loadEnvFileSafely(envPath: string): void {
  const allowed = new Set([
    'S3_ENDPOINT',
    'S3_REGION',
    'S3_BUCKET',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'S3_FORCE_PATH_STYLE',
    'BACKUP_RETENTION_DAYS',
  ]);
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!allowed.has(key) || process.env[key] !== undefined) continue;
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function resolveEndpointForHost(rawEndpoint: string): Promise<string> {
  try {
    const parsed = new URL(rawEndpoint);
    if (parsed.hostname === 'host.docker.internal' && !existsSync('/.dockerenv')) {
      try {
        await lookup('host.docker.internal');
      } catch {
        console.info(
          '[INFO] host.docker.internal tidak teresolusi di host Linux; beralih ke 127.0.0.1.'
        );
        parsed.hostname = '127.0.0.1';
        return parsed.toString().replace(/\/$/, '');
      }
    }
  } catch {
    // Biarkan S3Client menolak URL tidak valid secara eksplisit
  }
  return rawEndpoint;
}

// 1. Parse --help dan mode terlebih dahulu sebelum memvalidasi kredensial S3
const mode = Bun.argv[2];
if (!mode || hasFlag('-h') || hasFlag('--help') || mode === '--help' || mode === '-h') {
  usage(0);
}
if (mode !== 'backup' && mode !== 'restore') {
  console.error(`[ERROR] Mode tidak dikenal: ${mode}`);
  usage(1);
}

// 2. Muat file .env dari --env-file, infra/.env, atau .env root
const explicitEnv = valueAfter('--env-file');
if (explicitEnv) {
  if (!existsSync(explicitEnv)) {
    console.error(`[ERROR] File env tidak ditemukan: ${explicitEnv}`);
    process.exit(1);
  }
  loadEnvFileSafely(explicitEnv);
} else {
  const infraEnv = path.join(PROJECT_ROOT, 'infra', '.env');
  const rootEnv = path.join(PROJECT_ROOT, '.env');
  if (existsSync(infraEnv)) {
    loadEnvFileSafely(infraEnv);
  } else if (existsSync(rootEnv)) {
    loadEnvFileSafely(rootEnv);
  }
}

// 3. Validasi argumen per mode sebelum menghubungi S3
const output = mode === 'backup' ? valueAfter('--output') : undefined;
const prefix = mode === 'backup' ? valueAfter('--prefix') : undefined;
const keepDaysRaw = valueAfter('--keep-days') ?? process.env.BACKUP_RETENTION_DAYS ?? '14';
const keepDays = Number.parseInt(keepDaysRaw, 10);
if (mode === 'backup') {
  if (!output) usage(1);
  if (!Number.isInteger(keepDays) || keepDays < 0) {
    console.error(`[ERROR] Nilai --keep-days tidak valid: ${keepDaysRaw}`);
    process.exit(1);
  }
}
const input = mode === 'restore' ? valueAfter('--input') : undefined;
const targetBucket = mode === 'restore' ? valueAfter('--target-bucket') : undefined;
if (mode === 'restore' && (!input || !targetBucket)) {
  usage(1);
}

// 4. Validasi konfigurasi S3/RustFS (tolak placeholder .env.example)
const config = loadConfig();
if (
  !config.s3.endpoint ||
  !config.s3.accessKey ||
  !config.s3.secretKey ||
  !config.s3.bucket ||
  config.s3.accessKey.startsWith('change-with-') ||
  config.s3.secretKey.startsWith('change-with-')
) {
  console.error(
    '[ERROR] Konfigurasi S3/RustFS belum lengkap atau masih menggunakan nilai placeholder.'
  );
  process.exit(1);
}

const resolvedEndpoint = await resolveEndpointForHost(config.s3.endpoint);
const s3 = new S3Client({
  endpoint: resolvedEndpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: config.s3.forcePathStyle,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5_000,
    requestTimeout: 30_000,
  }),
});
const client = new S3ObjectArchiveClient(s3);

if (mode === 'backup' && output) {
  const manifest = await backupObjectStorage(
    client,
    config.s3.bucket,
    output,
    prefix
  );
  console.log(`Cadangan selesai: ${manifest.objects.length} objek (${output}).`);

  if (keepDays > 0) {
    const pruned = await pruneOldStorageBackups(
      path.dirname(path.resolve(output)),
      keepDays,
      output
    );
    if (pruned > 0) {
      console.log(
        `[RETENSI] Menghapus ${pruned} direktori backup storage lama (> ${keepDays} hari).`
      );
    }
  }
} else if (mode === 'restore' && input && targetBucket) {
  const manifest = await restoreObjectStorage(client, input, targetBucket);
  console.log(`Restore selesai: ${manifest.objects.length} objek ke '${targetBucket}'.`);
}
