import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const getBackendPort = () => {
  try {
    const portPath = path.resolve(__dirname, '../port.txt');
    if (fs.existsSync(portPath)) {
      const p = parseInt(fs.readFileSync(portPath, 'utf8').trim(), 10);
      if (!Number.isNaN(p) && p > 0) return p;
    }
  } catch (_) {}
  return 3000;
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${getBackendPort()}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-markdown': ['marked']
        }
      }
    }
  }
});
