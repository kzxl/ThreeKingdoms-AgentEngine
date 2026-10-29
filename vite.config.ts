import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  publicDir: false,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true
      }
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/client/main.ts'),
      name: 'SimulationClient',
      fileName: (format) => `client-bundle.${format}.js`,
      formats: ['es', 'iife']
    },
    outDir: path.resolve(__dirname, 'public/dist'),
    emptyOutDir: false,
    sourcemap: true
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@client': path.resolve(__dirname, 'src/client')
    }
  }
});
