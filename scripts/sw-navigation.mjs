// Which page navigations the service worker must NOT answer with the app.
//
// The app is hash-routed: every route lives at "/" (or "/index.html"), and the
// part after "#" never reaches the worker. Workbox's NavigationRoute answers
// any navigation that is not in the precache with the precached index.html, so
// that "/?config=…" (a Storage Calculator share link) still opens offline.
// With no denylist it does the same for real files: with the worker active,
// /robots.txt, /sitemap.xml and /.well-known/security.txt all opened the app
// instead of the file (observed in Chrome 158, 2026-11-20).
//
// Each pattern is tested against pathname + search. A match means "leave it
// alone": the request goes to the precache if the file is there, otherwise to
// the network.
export const NAVIGATE_FALLBACK_DENYLIST = [
  // RFC 8615 paths: security.txt today, anything else a host or standard adds.
  /^\/\.well-known\//,
  // Any path whose last segment has a file extension other than .html/.htm:
  // /robots.txt, /sitemap.xml, /third-party-licenses.txt, /assets/x.js.
  // "[^?]*" stops at the query string, so a dot in "?config=1.5" does not count.
  /^[^?]*\/[^/?]+\.(?!html?(?:\?|$))[^/?.]+(?:\?|$)/i,
];
