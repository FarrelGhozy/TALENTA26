import { createServer } from './app/server';
import { loadConfig } from './lib/config';
import { closeDatabase } from './lib/prisma';
import { logger } from './lib/logger';
import { startMaintenanceScheduler, stopMaintenanceScheduler } from './lib/maintenance';

const currentConfig = loadConfig();
const app = createServer();

// Batasi ukuran payload & idle timeout di level server Bun (anti slow-body & memory exhaustion)
const maxRequestBodySize = Math.max(28 * 1024 * 1024, currentConfig.uploadMaxBytes * 3 + 4 * 1024 * 1024);

app.listen(
  {
    port: currentConfig.port,
    maxRequestBodySize,
    idleTimeout: 30,
  },
  () => {
    logger.info('SERVER', 'USC API server started', {
      port: currentConfig.port,
      env: currentConfig.nodeEnv,
      maxRequestBodySizeBytes: maxRequestBodySize,
    });
    startMaintenanceScheduler();
  }
);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('SERVER', `Received ${signal}, shutting down gracefully...`);
  stopMaintenanceScheduler();
  try {
    await app.stop();
  } catch (err) {
    logger.warn('SERVER', 'Error while stopping HTTP server', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  try {
    await closeDatabase();
  } catch (err) {
    logger.warn('SERVER', 'Error while closing database pool', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
