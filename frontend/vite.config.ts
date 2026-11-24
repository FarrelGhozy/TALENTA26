import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL('..', import.meta.url));
  const env = loadEnv(mode, envDir, '');
  // Build --mode production wajib selalu memakai adapter API nyata, mengabaikan VITE_USE_MOCK lokal
  const isProductionMode = mode === 'production';
  const useMock = !isProductionMode && (mode === 'demo' || env.VITE_USE_MOCK === 'true');
  const source = useMock ? './src/services/factory.mock.ts' : './src/services/factory.api.ts';

  return {
    // Kunci base path di build produksi agar VITE_BASE_PATH lokal (mis. /TALENTA26/ untuk GitHub Pages demo)
    // tidak pernah merusak aset container produksi.
    base: isProductionMode ? (env.PROD_BASE_PATH || '/') : (env.VITE_BASE_PATH || '/'),
    envDir,
    define: isProductionMode
      ? {
          'import.meta.env.VITE_APP_ENV': JSON.stringify('PRODUCTION'),
          'import.meta.env.VITE_USE_MOCK': JSON.stringify('false'),
        }
      : undefined,
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
