// Collects the licence texts of the third-party software the site serves and
// renders them as one plain-text file, third-party-licenses.txt.
//
// Why it exists: the minifier strips comments, so the built JavaScript carries
// none of the copyright and permission notices that the MIT, ISC, BSD and
// Apache licences ask to travel with copies of the software (only the PDF.js
// worker keeps its banner). vite.config.js calls collectLicences() on every
// production build, and the build fails if a shipped package has no licence
// text.
//
// No dependencies: package-lock.json says what ships, node_modules holds the
// texts.
//
// Check it without building:  node scripts/third-party-licenses.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Served at the site root. The Terms of use page links to it. */
export const LICENCES_FILE = 'third-party-licenses.txt';

/**
 * Build tools whose own code is written into the files the site serves. They
 * are devDependencies, so the production closure does not include them.
 *
 * vite.config.js checks the Workbox entries against the built worker runtime
 * on every build (workboxPackagesIn), so a Workbox option that pulls in
 * another runtime package fails the build until it is added here. A name that
 * is no longer in package-lock.json also fails, so the list cannot go stale.
 *
 * Not listed, on purpose: the small helper snippets the build tools generate
 * into every build, treated as tool output rather than a copy of a library.
 * All of these tools are MIT-licensed.
 *   - Vite (module-preload helper), Rolldown (module-interop runtime),
 *     vite-plugin-pwa (registerSW.js) and workbox-build (its own lines in
 *     sw.js) are in package-lock.json, so adding a name here lists one. Vite's
 *     licence file is 111 KB, because it also covers tools bundled inside Vite
 *     that the site does not contain.
 *   - Rolldown also inlines class-field helpers from @oxc-project/runtime.
 *     That package is compiled into Rolldown and not installed, so it cannot
 *     be listed from here: its licence text would have to be added by hand
 *     and re-checked whenever Rolldown changes.
 * Whether to list them is the maintainer's decision (docs/LEGAL-PAGES.md).
 */
export const SERVED_BUILD_PACKAGES = {
  'workbox-core': 'Build tool. Part of the service worker runtime the site serves (workbox-*.js).',
  'workbox-precaching': 'Build tool. Part of the service worker runtime the site serves (workbox-*.js).',
  'workbox-routing': 'Build tool. Part of the service worker runtime the site serves (workbox-*.js).',
  'workbox-strategies': 'Build tool. Part of the service worker runtime the site serves (workbox-*.js).',
  '@trickfilm400/rollup-plugin-off-main-thread':
    'Build tool. Its module loader is the opening statement of the service worker the site serves (sw.js).',
};

/**
 * Packages whose npm tarball contains no licence file. The text for each is in
 * scripts/licence-fallbacks/<name>@<version>.txt ("/" in a scoped name becomes
 * "+"). The note says where the text was copied from and is printed with it.
 *
 * Each entry is tied to one exact version on purpose: after an upgrade the
 * build fails until someone checks whether the new tarball ships its own
 * licence file, then updates or removes the entry.
 */
export const LICENCE_FALLBACKS = {
  'isarray@1.0.0':
    'This package publishes no licence file. The text is the "License" section of the README.md inside the package.',
  '@pdf-lib/fontkit@1.1.1':
    'This package publishes no licence file; its package.json declares the MIT licence. The text is the LICENSE of ' +
    'foliojs/fontkit, the project it is a fork of (commit d65a577).',
};

const FALLBACK_DIR = 'scripts/licence-fallbacks';

// LICENSE, LICENCE.md, license.txt, LICENSE-MPL, LICENSE.APACHE2, COPYING,
// NOTICE, UNLICENSE … but not license.js or license-checker.json.
const LICENCE_FILE_NAME = /^(?:licen[cs]e|unlicense|copying|notice)(?:[-_.][a-z0-9]+)*$/i;
const CODE_OR_DATA_FILE = /\.(?:[cm]?[jt]sx?|json|map)$/i;

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** 'node_modules/a/node_modules/@scope/b' -> '@scope/b' */
function packageNameOf(lockPath) {
  return lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
}

/**
 * The packages whose code the built site serves: everything a production
 * install brings in, plus the build tools named in `servedBuildPackages`.
 *
 * "Production install" is `npm ci --omit=dev --omit=optional`: lockfile
 * entries flagged dev, optional or devOptional are left out. In this project
 * the optional ones are pdfjs-dist's native Node canvas add-ons and DOMPurify's
 * type declarations, none of which a browser can load; only the add-on for the
 * machine running the build is even installed. vite.config.js checks the
 * exclusion on every build: no bundled module may come from a package that is
 * missing from this list.
 */
export function shippedPackages(lock, servedBuildPackages = SERVED_BUILD_PACKAGES) {
  const packages = [];
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (path === '') continue; // the site itself
    const name = packageNameOf(path);
    const production = !entry.dev && !entry.optional && !entry.devOptional;
    const served = path === `node_modules/${name}` && Object.hasOwn(servedBuildPackages, name);
    if (!production && !served) continue;
    packages.push({
      path,
      name,
      version: entry.version,
      license: entry.license ?? null,
      note: production ? null : servedBuildPackages[name],
    });
  }
  for (const name of Object.keys(servedBuildPackages)) {
    if (!packages.some((pkg) => pkg.path === `node_modules/${name}`)) {
      throw new Error(
        `${name} is listed in SERVED_BUILD_PACKAGES (scripts/third-party-licenses.mjs) but is not in package-lock.json. ` +
          'If the build no longer writes its code into dist/, remove it from the list.',
      );
    }
  }
  return packages.sort((a, b) => byCodePoint(a.name, b.name) || byCodePoint(a.version, b.version));
}

/** Names of the licence files at the top level of an installed package. */
export function licenceFilesIn(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && LICENCE_FILE_NAME.test(entry.name) && !CODE_OR_DATA_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort(byCodePoint);
}

// The words are never changed. Only what cannot survive concatenation is: a
// byte-order mark, Windows line endings (git checks this repo out with CRLF)
// and blank lines at either end.
function readLicenceText(file) {
  return readFileSync(file, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+/, '')
    .trimEnd();
}

function licenceIdFromManifest(dir) {
  try {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    if (typeof manifest.license === 'string') return manifest.license;
    if (typeof manifest.license?.type === 'string') return manifest.license.type;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return null;
}

/**
 * Reads the licence text of every shipped package under `root`.
 * Returns { packages, text }; `text` is the content of third-party-licenses.txt.
 * Throws one error naming every package it could not get a licence text for.
 */
export function collectLicences({
  root,
  servedBuildPackages = SERVED_BUILD_PACKAGES,
  fallbacks = LICENCE_FALLBACKS,
}) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const problems = [];
  const packages = [];

  for (const pkg of shippedPackages(lock, servedBuildPackages)) {
    const id = `${pkg.name}@${pkg.version}`;
    // Read first and handle "not there" afterwards: checking for a path and
    // then reading it is a race, and one that code scanning flags.
    const dir = join(root, pkg.path);
    let files;
    try {
      files = licenceFilesIn(dir).map((name) => ({ name, text: readLicenceText(join(dir, name)) }));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      problems.push(`${id} is not installed (${pkg.path} is missing). Run npm ci.`);
      continue;
    }

    let fallback = null;
    if (files.length === 0 && Object.hasOwn(fallbacks, id)) {
      const fallbackFile = `${FALLBACK_DIR}/${id.replaceAll('/', '+')}.txt`;
      try {
        files = [{ name: 'licence text', text: readLicenceText(join(root, fallbackFile)) }];
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        problems.push(`${id} has a LICENCE_FALLBACKS entry but ${fallbackFile} is missing.`);
        continue;
      }
      fallback = fallbacks[id];
    }
    if (files.length === 0) {
      problems.push(`${id} has no LICENSE, LICENCE, COPYING or NOTICE file in ${pkg.path}.`);
      continue;
    }

    const unreadable = files.find((file) => file.text === '' || file.text.includes('\uFFFD'));
    if (unreadable) {
      problems.push(`${id}: ${unreadable.name} is empty or is not UTF-8 text.`);
      continue;
    }

    // npm wraps a compound expression in brackets: '(MIT OR GPL-3.0-or-later)'.
    // One enclosing pair adds nothing in print.
    const license = (pkg.license ?? licenceIdFromManifest(dir))?.replace(/^\(([^()]*)\)$/, '$1');
    if (!license) {
      problems.push(`${id} names no licence in package-lock.json or its package.json.`);
      continue;
    }

    packages.push({ ...pkg, license, files, fallback });
  }

  if (problems.length > 0) {
    throw new Error(
      `Cannot write ${LICENCES_FILE}: ${problems.length} shipped package${problems.length === 1 ? '' : 's'} without a usable licence text.\n` +
        problems.map((problem) => `  - ${problem}`).join('\n') +
        '\nFor a package that publishes no licence file, find the text its authors publish (README, source repository), ' +
        `save it as ${FALLBACK_DIR}/<name>@<version>.txt and add an entry to LICENCE_FALLBACKS in scripts/third-party-licenses.mjs.`,
    );
  }

  return { packages, text: renderLicences(packages) };
}

const RULE = '-'.repeat(78);

function renderLicences(packages) {
  const lines = [
    'RDM Toolkit: third-party software licences',
    '',
    'RDM Toolkit is built with the open-source software listed below. Each',
    'package is the work of its authors and is used under its own licence. The',
    'code the site serves is minified, which removes licence comments, so the',
    'copyright and permission notices are reproduced here in full.',
    '',
    'This file is written by the site\'s build from the packages it installs. It',
    `covers ${packages.length} package${packages.length === 1 ? '' : 's'}:`,
    '',
    ...packages.map((pkg) => `  ${pkg.name} ${pkg.version} (${pkg.license})`),
    '',
  ];

  for (const pkg of packages) {
    lines.push(RULE, `${pkg.name} ${pkg.version}`, `Licence: ${pkg.license}`);
    if (pkg.note) lines.push(`Note: ${pkg.note}`);
    if (pkg.fallback) lines.push(`Note: ${pkg.fallback}`);
    lines.push(RULE, '');
    for (const file of pkg.files) {
      // Several files (DOMPurify ships one per licence it offers): say which is which.
      if (pkg.files.length > 1) lines.push(`[${file.name}]`, '');
      lines.push(file.text, '');
    }
  }

  // Several licences name authors with accented letters. The byte-order mark
  // makes a browser read the file as UTF-8 even on a host that sends .txt
  // without a charset. `vite preview` is one: Chrome 158 read this same text
  // without the mark as windows-1252 and garbled those names.
  return `\uFEFF${lines.join('\n')}`;
}

/**
 * The lockfile paths of the packages that bundled modules come from.
 * vite.config.js uses it to fail a build whose bundle holds code from a
 * package that is not in the licences file.
 *
 * 'C:/app/node_modules/a/node_modules/@s/b/lib/x.js?url' -> 'node_modules/a/node_modules/@s/b'
 */
export function packagePathsOfModules(moduleIds, root) {
  const base = `${root.replace(/\\/g, '/').replace(/\/+$/, '')}/`.toLowerCase();
  const paths = new Set();
  for (const moduleId of moduleIds) {
    let id = moduleId.replace(/\0/g, '').replace(/\\/g, '/');
    if (id.toLowerCase().startsWith(base)) {
      id = id.slice(base.length);
    } else {
      const outside = id.indexOf('/node_modules/');
      if (outside === -1) continue;
      id = id.slice(outside + 1);
    }
    const query = id.search(/[?#]/);
    if (query !== -1) id = id.slice(0, query);

    const last = id.lastIndexOf('node_modules/');
    if (last === -1 || (last > 0 && id[last - 1] !== '/')) continue;
    const [first, second] = id.slice(last + 'node_modules/'.length).split('/');
    const name = first.startsWith('@') ? `${first}/${second}` : first;
    paths.add(`${id.slice(0, last)}node_modules/${name}`);
  }
  return paths;
}

/**
 * The Workbox packages inside a built service-worker runtime. Each Workbox
 * package registers a marker such as self["workbox:core:7.4.0"]. Only the name
 * is used: the number in the marker is not always the package's version.
 */
export function workboxPackagesIn(source) {
  const names = [...source.matchAll(/workbox:([a-z-]+):\d/g)].map((match) => `workbox-${match[1]}`);
  return [...new Set(names)].sort(byCodePoint);
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  try {
    const { packages, text } = collectLicences({ root: process.cwd() });
    console.log(`${LICENCES_FILE}: ${packages.length} packages, ${Buffer.byteLength(text)} bytes.`);
    for (const pkg of packages) console.log(`  ${pkg.name} ${pkg.version} (${pkg.license})`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
