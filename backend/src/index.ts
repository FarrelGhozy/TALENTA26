import { createServer } from './app/server';
import { loadConfig } from './lib/config';

const currentConfig = loadConfig();
const app = createServer();

app.listen(currentConfig.port, () => {
  console.log(
    `[TALENTA_API] Server berjalan pada port ${currentConfig.port} (env: ${currentConfig.nodeEnv})`
  );
  console.log(`[TALENTA_API] Health check: http://localhost:${currentConfig.port}/health/ready`);
});
