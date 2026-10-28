import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { catalogueAssets } from './scripts/netlify-assets';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), catalogueAssets()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
