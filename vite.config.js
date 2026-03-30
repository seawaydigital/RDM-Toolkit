import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/RDM-Toolkit/',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [{
        src: 'node_modules/@imgly/background-removal/dist/assets',
        dest: 'assets/imgly'
      }]
    })
  ],
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.worker.min.js'],
  },
  worker: { format: 'es' },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['@cantoo/pdf-lib'],
          'pdfjs': ['pdfjs-dist'],
          'jszip': ['jszip'],
        },
      },
    },
  },
});
