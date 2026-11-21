import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL('..', import.meta.url));
  const env = loadEnv(mode, envDir, '');
  const useMock = mode === 'demo' || env.VITE_USE_MOCK === 'true';
  const source = useMock ? './src/services/factory.mock.ts' : './src/services/factory.api.ts';

  return {
    base: env.VITE_BASE_PATH || '/',
    envDir,
    resolve: {
      alias: {
        '@talenta/services': fileURLToPath(new URL(source, import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy:
        !useMock && (env.VITE_API_BASE_URL || '/api/v1').startsWith('/')
          ? {
              '/api': {
                target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001',
                changeOrigin: true,
              },
              '/health': {
                target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001',
                changeOrigin: true,
              },
            }
          : undefined,
    },
    plugins: [react(), tailwindcss()],
  };
});
