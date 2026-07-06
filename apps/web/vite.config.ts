import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          'antd-vendor': ['antd', '@ant-design/icons'],
          excel: ['read-excel-file/browser', 'write-excel-file/browser']
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts']
  },
  server: {
    port: 5173
  }
});
