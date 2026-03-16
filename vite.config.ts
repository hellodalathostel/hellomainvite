import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
  const buildId = process.env.BUILD_ID || Date.now().toString();
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'firebase': ['firebase/app', 'firebase/database', 'firebase/auth']
            }
          }
        }
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
        exclude: ['dist', 'build']
      },
      define: {
        __APP_BUILD_ID__: JSON.stringify(buildId),
      }
    };
});
