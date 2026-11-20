import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import {
  LICENCES_FILE,
  SERVED_BUILD_PACKAGES,
  collectLicences,
  packagePathsOfModules,
  workboxPackagesIn,
} from './scripts/third-party-licenses.mjs';
import { NAVIGATE_FALLBACK_DENYLIST } from './scripts/sw-navigation.mjs';

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; trusted-types dompurify default; require-trusted-types-for 'script'; upgrade-insecure-requests",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
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

// A service worker takes its CSP from the response that served sw.js. Hosts
// that send public/_headers (or the docs/hosting/ configs) therefore enforce
// require-trusted-types-for 'script' inside the worker too, and Workbox's
// importScripts() calls — its runtime and public/sw-reload.js — are string
// script-URL sinks. Without a policy they throw: the worker registers but
// never caches or controls a page, so offline support silently disappears.
// This prepends a `default` policy to the generated sw.js that vouches for
// same-origin URLs only (script-src 'self' already limits imports to those).
// Runs after vite-plugin-pwa writes sw.js; fails the build if it cannot.
const SW_TRUSTED_TYPES_POLICY =
  "if(self.trustedTypes&&self.trustedTypes.createPolicy){self.trustedTypes.createPolicy('default',{createScriptURL(u){if(new URL(u,self.location.href).origin===self.location.origin)return u;throw new TypeError('Blocked cross-origin script URL: '+u)}})}\n";

const serviceWorkerTrustedTypes = () => ({
  name: 'sw-trusted-types',
  apply: 'build',
  enforce: 'post',
  closeBundle: {
    sequential: true,
    order: 'post',
    handler() {
      const swPath = resolve(distDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      if (sw.startsWith(SW_TRUSTED_TYPES_POLICY)) return;
      writeFileSync(swPath, SW_TRUSTED_TYPES_POLICY + sw);
    },
  },
});

// The minifier strips licence comments, so the built JavaScript carries none of
// the copyright and permission notices its third-party code is licensed under.
// Every production build therefore writes them to one plain file at the site
// root. scripts/third-party-licenses.mjs decides which packages ship and reads
// their licence files. The build fails if a shipped package has no licence
// text, or if the bundle holds code from a package the file does not list.
const thirdPartyLicenses = () => ({
  name: 'third-party-licenses',
  // The dev server has no dist/. Serve the same text there, so a link to the
  // file opens the file and not the app.
  configureServer(server) {
    server.middlewares.use(`/${LICENCES_FILE}`, (_req, res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(collectLicences({ root: process.cwd() }).text);
    });
  },
  generateBundle(_options, bundle) {
    const { packages, text } = collectLicences({ root: process.cwd() });

    // The list comes from package-lock.json. Check it against what was
    // actually bundled: a dev-only or optional package that some module
    // imports would otherwise ship without its notice.
    const moduleIds = Object.values(bundle).flatMap((file) =>
      file.type === 'chunk' ? file.moduleIds ?? Object.keys(file.modules ?? {}) : [],
    );
    const bundled = packagePathsOfModules(moduleIds, process.cwd());
    if (bundled.size === 0) {
      this.error(`${LICENCES_FILE}: could not read which packages the bundle contains, so the list cannot be checked.`);
    }
    const listed = new Set(packages.map((pkg) => pkg.path));
    const unlisted = [...bundled].filter((path) => !listed.has(path));
    if (unlisted.length > 0) {
      this.error(
        `The bundle contains code from packages that ${LICENCES_FILE} does not list: ${unlisted.join(', ')}. ` +
          'They are dev-only or optional in package-lock.json. Add each to SERVED_BUILD_PACKAGES in ' +
          'scripts/third-party-licenses.mjs, or make it a real dependency.',
      );
    }

    this.emitFile({ type: 'asset', fileName: LICENCES_FILE, source: text });
  },
});

// Checks the service worker that vite-plugin-pwa has just written. Each of
// these is easy to break with an unrelated option change, and none shows up
// until someone is offline or follows a link to a plain file:
//   1. the licences file is precached, so it opens offline;
//   2. the navigation fallback carries the denylist, so plain files such as
//      /robots.txt open as themselves and not as the app
//      (scripts/sw-navigation.mjs);
//   3. every Workbox package inside the worker's runtime is in the licences
//      file.
function generatedServiceWorkerProblems() {
  const problems = [];
  const sw = readFileSync(resolve(distDir, 'sw.js'), 'utf8');

  if (!sw.includes(`url:"${LICENCES_FILE}"`)) {
    problems.push(`sw.js does not precache ${LICENCES_FILE} (workbox.globPatterns), so it would not open offline.`);
  }
  for (const pattern of NAVIGATE_FALLBACK_DENYLIST) {
    if (!sw.includes(String(pattern))) {
      problems.push(`sw.js is missing ${pattern} from its navigation denylist (workbox.navigateFallbackDenylist).`);
    }
  }

  const runtimes = readdirSync(distDir).filter((name) => /^workbox-[\w-]+\.js$/.test(name));
  if (runtimes.length === 0) problems.push('no workbox-*.js runtime was found next to sw.js.');
  for (const runtime of runtimes) {
    for (const name of workboxPackagesIn(readFileSync(resolve(distDir, runtime), 'utf8'))) {
      if (!Object.hasOwn(SERVED_BUILD_PACKAGES, name)) {
        problems.push(
          `${runtime} contains ${name}, which ${LICENCES_FILE} does not list. Add it to SERVED_BUILD_PACKAGES in scripts/third-party-licenses.mjs.`,
        );
      }
    }
  }
  return problems;
}

const verifyGeneratedServiceWorker = () => {
  let written = false;
  return {
    name: 'verify-generated-service-worker',
    apply: 'build',
    enforce: 'post',
    writeBundle() {
      written = true;
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      handler(error) {
        // closeBundle also runs after a failed build, and vite-plugin-pwa still
        // writes a worker over whatever is left in dist/. Checking that would
        // replace the real error with a misleading one about the worker.
        if (error || !written) return;

        const problems = generatedServiceWorkerProblems();
        if (problems.length > 0) {
          throw new Error(`The generated service worker is not what the site needs:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
        }
      },
    },
  };
};

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    previewSecurityHeaders(),
    buildCspTighten(),
    thirdPartyLicenses(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // The licences file is the one plain file that is precached: the Terms
        // of use page links to it, and it has to open offline like the rest.
        globPatterns: ['**/*.{js,css,html,woff,woff2,ttf,ico,png,svg,webp}', LICENCES_FILE],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB (covers pdfjs worker)
        // Without this the worker answers /robots.txt, /sitemap.xml and
        // /.well-known/security.txt with the app. See scripts/sw-navigation.mjs.
        navigateFallbackDenylist: NAVIGATE_FALLBACK_DENYLIST,
        runtimeCaching: [],
        skipWaiting: true,   // activate new SW immediately on deploy
        clientsClaim: true,  // take control of all open tabs right away
        // …and reload them, or they keep running the old build (public/sw-reload.js)
        importScripts: ['sw-reload.js'],
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
    serviceWorkerTrustedTypes(),
    verifyGeneratedServiceWorker(),
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
          // Pure pdf-lib helpers shared by more than one lazy tool. Pinned here so
          // Rolldown does not emit a new shared chunk (the bundle-integrity gate
          // rejects new chunk names).
          if (normalized.includes('/src/utils/pdfEncrypt.js')) return 'pdf-lib';
          if (normalized.includes('/src/utils/pdfMetadata.js')) return 'pdf-lib';
          if (normalized.includes('/src/utils/pdfPageIsolation.js')) return 'pdf-lib';
          if (normalized.includes('/src/utils/jpegMetadata.js')) return 'pdf-lib';
          // Sample-file generators shared by three lazy tools (De-identify,
          // PDF Redaction, Strip Image Metadata). Small, so they ride in the
          // entry chunk rather than becoming a new shared chunk.
          if (normalized.includes('/src/utils/sampleFiles.js')) return 'index';
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
