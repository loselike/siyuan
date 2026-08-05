import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

function sourceReleaseId() {
  const hash = createHash('sha256');
  const visit = (directory: string) => {
    readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (['.ts', '.tsx', '.js', '.jsx', '.css'].includes(extname(entry.name))) {
          hash.update(path.slice(webRoot.length));
          hash.update(readFileSync(path));
        }
      });
  };
  visit(resolve(webRoot, 'src'));
  hash.update(readFileSync(resolve(webRoot, 'package.json')));
  return `web-${hash.digest('hex').slice(0, 24)}`;
}

const configuredReleaseId = process.env.VITE_RELEASE_ID?.trim();
const resolvedReleaseId = configuredReleaseId && !['unknown', 'local-dev'].includes(configuredReleaseId)
  ? configuredReleaseId
  : sourceReleaseId();

function releaseManifestPlugin(): Plugin {
  const source = () => JSON.stringify({
    releaseId: resolvedReleaseId
  });
  return {
    name: 'siyuan-release-manifest',
    configureServer(server) {
      server.middlewares.use('/version.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.end(source());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: source() });
    }
  };
}

export default defineConfig({
  plugins: [react(), releaseManifestPlugin()],
  define: {
    'import.meta.env.VITE_RELEASE_ID': JSON.stringify(resolvedReleaseId)
  },
  build: {
    chunkSizeWarningLimit: 1100,
    // Keep production stack traces mappable by release id without advertising
    // source maps in generated browser bundles.
    sourcemap: 'hidden',
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
