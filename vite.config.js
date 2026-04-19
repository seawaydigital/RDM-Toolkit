import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/RDM-Toolkit/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,ttf,ico,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB (covers pdfjs worker)
        runtimeCaching: [],
        skipWaiting: true,   // activate new SW immediately on deploy
        clientsClaim: true,  // take control of all open tabs right away
      },
      manifest: {
        name: 'RDM Toolkit',
        short_name: 'RDM Toolkit',
        description: 'Research Data Management Tools — 100% browser-based',
        theme_color: '#0D1B35',
        background_color: '#0D1B35',
        display: 'standalone',
        scope: '/RDM-Toolkit/',
        start_url: '/RDM-Toolkit/',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
    viteStaticCopy({
      targets: [{
        src: 'node_modules/@imgly/background-removal/dist/assets',
        dest: 'assets/imgly'
      }]
    })
  ],
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.worker.min.mjs'],
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
          'zxcvbn': ['zxcvbn'],
          'dompurify': ['dompurify'],
          'xlsx': ['xlsx'],
        },
      },
    },
  },
});
