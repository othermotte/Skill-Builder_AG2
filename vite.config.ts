import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: "",
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      target: ['es2020', 'safari13'], // Ensure compatibility with Safari 13+
    },
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
