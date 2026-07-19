import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; trusted-types dompurify default; require-trusted-types-for 'script'; upgrade-insecure-requests",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
};

const previewSecurityHeaders = () => ({
  name: 'preview-security-headers',
  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        res.setHeader(name, value);
      }
      next();
    });
  },
});

// Production builds get the strict CSP: no 'unsafe-inline' for styles (React
// applies inline styles via CSSOM, which style-src does not block) and Trusted
// Types enforcement on script sinks. Dev keeps the relaxed meta CSP from
// index.html because Vite's HMR injects <style> elements at runtime.
const buildCspTighten = () => ({
  name: 'build-csp-tighten',
  apply: 'build',
  transformIndexHtml(html) {
    return html
      .replace("style-src 'self' 'unsafe-inline';", "style-src 'self';")
      .replace(
        "form-action 'self';",
        "form-action 'self';\n      trusted-types dompurify default;\n      require-trusted-types-for 'script';",
      );
  },
});

function integrityFor(filePath) {
  try {
    return `sha384-${createHash('sha384').update(readFileSync(filePath)).digest('base64')}`;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const distDir = resolve(process.cwd(), 'dist');

function resolveDistAsset(src) {
  if (!src.startsWith('/assets/') || !/^\/assets\/[A-Za-z0-9._/-]+\.(?:css|js)$/.test(src)) {
    return null;
  }
  const relativeSrc = src.slice(1);
  const resolved = resolve(distDir, relativeSrc);
  if (!resolved.startsWith(`${distDir}${sep}`)) return null;
  return resolved;
}

function addIntegrity(tag, src) {
  const filePath = resolveDistAsset(src);
  if (!filePath) return tag;
  if (/\sintegrity=/.test(tag)) return tag;

  const integrity = integrityFor(filePath);
  if (!integrity) return tag;
  const crossOrigin = /\scrossorigin(?:[=>\s]|$)/.test(tag) ? '' : ' crossorigin="anonymous"';
  if (tag.endsWith('</script>')) {
    return tag.replace(/><\/script>$/, ` integrity="${integrity}"${crossOrigin}></script>`);
  }
  return tag.replace(/>$/, ` integrity="${integrity}"${crossOrigin}>`);
}

const distSubresourceIntegrity = () => ({
  name: 'dist-subresource-integrity',
  closeBundle() {
    const indexPath = resolve(distDir, 'index.html');
    let indexHtml;
    try {
      indexHtml = readFileSync(indexPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    const html = indexHtml
      .replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
        if (!src.startsWith('/')) return tag;
        return addIntegrity(tag, src);
      })
      .replace(/<link\b[^>]*\bhref="([^"]+\.(?:css|js))"[^>]*>/g, (tag, href) => {
        if (!href.startsWith('/')) return tag;
        if (!/\brel="(?:stylesheet|modulepreload)"/.test(tag)) return tag;
        return addIntegrity(tag, href);
      });

    writeFileSync(indexPath, html);
  },
});

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    previewSecurityHeaders(),
    buildCspTighten(),
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
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
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
    distSubresourceIntegrity(),
  ],
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.worker.min.mjs'],
  },
  worker: { format: 'es' },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Rolldown (Vite 8's bundler) only accepts the function form of
        // manualChunks. Chunk names must stay stable — the bundle-integrity
        // CI guard compares logical chunk sets against master.
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules/@cantoo/pdf-lib/')) return 'pdf-lib';
          if (normalized.includes('node_modules/pdfjs-dist/')) return 'pdfjs';
          if (normalized.includes('node_modules/jszip/')) return 'jszip';
          if (normalized.includes('node_modules/zxcvbn/')) return 'zxcvbn';
          if (normalized.includes('node_modules/dompurify/')) return 'dompurify';
          // Rolldown splits these tiny always-loaded shared modules into their
          // own chunks; Rollup kept them in the entry. Pin them to the entry
          // chunk so the logical chunk set stays identical to the Vite 5 build
          // (the bundle-integrity CI guard rejects new chunks).
          if (normalized.includes('node_modules/react/jsx-runtime')) return 'index';
          if (normalized.includes('lucide-react') && normalized.includes('createLucideIcon')) return 'index';
          if (normalized.includes('rolldown:runtime') || normalized.includes('rolldown-runtime')) return 'index';
        },
      },
    },
  },
});
