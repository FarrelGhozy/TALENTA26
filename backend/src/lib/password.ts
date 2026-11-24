import { ServiceUnavailableError, ValidationError } from '../app/middleware/error';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// Semaphore konkurensi Argon2id: maks 4 operasi paralel (4 x 64 MiB = maks 256 MiB RAM native)
const MAX_CONCURRENT_ARGON2 = 4;
const MAX_QUEUE_LENGTH = 32;
const QUEUE_WAIT_TIMEOUT_MS = 5_000;

let activeArgon2Count = 0;
const waiters: Array<{
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}> = [];

async function acquireArgon2Slot(): Promise<void> {
  if (activeArgon2Count < MAX_CONCURRENT_ARGON2) {
    activeArgon2Count += 1;
    return;
  }

  if (waiters.length >= MAX_QUEUE_LENGTH) {
    throw new ServiceUnavailableError(
      'Server autentikasi sedang sibuk. Silakan coba kembali beberapa detik lagi.',
      5
    );
  }

  return new Promise<void>((resolve, reject) => {
    const entry = {
      resolve: () => {
        clearTimeout(entry.timer);
        activeArgon2Count += 1;
        resolve();
      },
      reject: (err: Error) => {
        clearTimeout(entry.timer);
        reject(err);
      },
      timer: setTimeout(() => {
        const idx = waiters.indexOf(entry);
        if (idx !== -1) waiters.splice(idx, 1);
        reject(
          new ServiceUnavailableError(
            'Server autentikasi sedang padat. Silakan coba kembali beberapa detik lagi.',
            5
          )
        );
      }, QUEUE_WAIT_TIMEOUT_MS),
    };
    waiters.push(entry);
  });
}

function releaseArgon2Slot(): void {
  activeArgon2Count = Math.max(0, activeArgon2Count - 1);
  const next = waiters.shift();
  if (next) {
    next.resolve();
  }
}

export function getArgon2ConcurrencyStats() {
  return {
    active: activeArgon2Count,
    queued: waiters.length,
    maxConcurrent: MAX_CONCURRENT_ARGON2,
  };
}

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || plainText.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter`);
  }
  if (plainText.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(`Password maksimal ${MAX_PASSWORD_LENGTH} karakter`);
  }

  await acquireArgon2Slot();
  try {
    return await Bun.password.hash(plainText, {
      algorithm: 'argon2id',
      memoryCost: 65536,
      timeCost: 2,
    });
  } finally {
    releaseArgon2Slot();
  }
}

export async function verifyPassword(
  plainText: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plainText || !hashedPassword || plainText.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  await acquireArgon2Slot();
  try {
    return await Bun.password.verify(plainText, hashedPassword);
  } catch {
    return false;
  } finally {
    releaseArgon2Slot();
  }
}
