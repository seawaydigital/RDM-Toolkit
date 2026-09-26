// Loaded into the generated service worker via workbox `importScripts`
// (see vite.config.js). Plain script, not bundled.
//
// skipWaiting + clientsClaim hand every open page to a new deploy's service
// worker within seconds, but those pages keep executing the previous build's
// JavaScript until they are reloaded. The page itself cannot fix that: it is
// running the old code, which has no reload logic. So the new worker reloads
// them. That matters when a deploy is a fix — the first visit after the
// 2026-09-25 deploy still ran the old Password Protect PDF, which wrote
// unencrypted files.
//
// Only on an update: on a first install there is nothing stale to replace, and
// a reload would just interrupt the visitor.
let isUpdate = false;

self.addEventListener('install', () => {
  isUpdate = Boolean(self.registration.active);
});

self.addEventListener('activate', (event) => {
  if (!isUpdate) return;
  const claimed = self.clients.claim();
  event.waitUntil(claimed);
  // Deliberately outside waitUntil: the browser holds each reload's navigation
  // request until activation finishes, so waiting on navigate() here deadlocks.
  claimed
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then((windows) => windows.forEach((win) => win.navigate(win.url).catch(() => {})));
});
