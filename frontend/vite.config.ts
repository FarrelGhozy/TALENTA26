import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const useMock = command === 'serve' || mode === 'demo';
  const source = useMock ? './src/services/factory.mock.ts' : './src/services/factory.api.ts';

  return {
    base: process.env.VITE_BASE_PATH || '/',
    envDir: fileURLToPath(new URL('..', import.meta.url)),
    resolve: {
      alias: {
        '@talenta/services': fileURLToPath(new URL(source, import.meta.url)),
      },
    },
    plugins: [react(), tailwindcss()],
  };
});
