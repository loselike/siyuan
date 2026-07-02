import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks: {
          'antd-vendor': ['antd', '@ant-design/icons'],
          xlsx: ['xlsx']
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
