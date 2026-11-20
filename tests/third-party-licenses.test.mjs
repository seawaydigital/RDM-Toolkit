import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  LICENCES_FILE,
  LICENCE_FALLBACKS,
  SERVED_BUILD_PACKAGES,
  collectLicences,
  packagePathsOfModules,
  shippedPackages,
  workboxPackagesIn,
} from '../scripts/third-party-licenses.mjs';

// ---- A throwaway project on disk: a lockfile plus installed packages ----

function project(t, { lockPackages, files = {} }) {
  const root = mkdtempSync(join(tmpdir(), 'rdm-licences-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lock = { name: 'fixture', lockfileVersion: 3, packages: { '': { name: 'fixture' }, ...lockPackages } };
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify(lock));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const MIT = 'MIT License\n\nCopyright (c) 2020 Someone\n\nPermission is hereby granted, free of charge, …';

// ---- Which packages ship ----

test('the shipped set is the production closure: dev and optional packages are left out', () => {
  const lock = {
    packages: {
      '': { name: 'app' },
      'node_modules/zeta': { version: '1.0.0', license: 'MIT' },
      'node_modules/@scope/alpha': { version: '2.0.0', license: 'ISC' },
      'node_modules/zeta/node_modules/nested': { version: '0.1.0', license: 'MIT' },
      'node_modules/build-tool': { version: '3.0.0', license: 'MIT', dev: true },
      'node_modules/native-addon': { version: '4.0.0', license: 'MIT', optional: true },
      'node_modules/types-only': { version: '5.0.0', license: 'MIT', devOptional: true },
    },
  };
  assert.deepEqual(shippedPackages(lock, {}), [
    { path: 'node_modules/@scope/alpha', name: '@scope/alpha', version: '2.0.0', license: 'ISC', note: null },
    { path: 'node_modules/zeta/node_modules/nested', name: 'nested', version: '0.1.0', license: 'MIT', note: null },
    { path: 'node_modules/zeta', name: 'zeta', version: '1.0.0', license: 'MIT', note: null },
  ]);
});

test('a build tool whose code is served is listed although it is a devDependency', () => {
  const lock = {
    packages: {
      'node_modules/app-lib': { version: '1.0.0', license: 'MIT' },
      'node_modules/sw-runtime': { version: '7.0.0', license: 'MIT', dev: true },
      'node_modules/other-tool': { version: '1.0.0', license: 'MIT', dev: true },
    },
  };
  const shipped = shippedPackages(lock, { 'sw-runtime': 'Served as the worker runtime.' });
  assert.deepEqual(shipped.map((p) => p.name), ['app-lib', 'sw-runtime']);
  assert.equal(shipped[1].note, 'Served as the worker runtime.');
});

test('a served build tool that is missing from the lockfile is an error, not a silent gap', () => {
  const lock = { packages: { 'node_modules/app-lib': { version: '1.0.0', license: 'MIT' } } };
  assert.throws(() => shippedPackages(lock, { 'sw-runtime': 'Served.' }), /sw-runtime.*not in package-lock\.json/s);
});

// ---- Reading the licence texts ----

test('each shipped package appears with its name, version, licence id and full licence text', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/alpha': { version: '1.2.3', license: 'MIT' },
      'node_modules/@scope/beta': { version: '0.4.0', license: 'Apache-2.0' },
    },
    files: {
      'node_modules/alpha/LICENSE': MIT,
      'node_modules/@scope/beta/LICENCE.md': 'Apache License\nVersion 2.0, January 2004\n',
    },
  });
  const { packages, text } = collectLicences({ root, servedBuildPackages: {} });

  assert.deepEqual(packages.map((p) => `${p.name}@${p.version} ${p.license}`), ['@scope/beta@0.4.0 Apache-2.0', 'alpha@1.2.3 MIT']);
  assert.ok(text.includes('alpha 1.2.3\nLicence: MIT\n'));
  assert.ok(text.includes(MIT));
  assert.ok(text.includes('@scope/beta 0.4.0\nLicence: Apache-2.0\n'));
  assert.ok(text.includes('Apache License\nVersion 2.0, January 2004'));
  assert.ok(text.includes('2 packages'));
});

test('a shipped package with no licence file fails, and every such package is named at once', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/alpha': { version: '1.0.0', license: 'MIT' },
      'node_modules/bare': { version: '2.0.0', license: 'MIT' },
      'node_modules/@scope/also-bare': { version: '3.0.0', license: 'ISC' },
    },
    files: {
      'node_modules/alpha/LICENSE': MIT,
      'node_modules/bare/README.md': '# bare\n\nLicensed under MIT.',
      'node_modules/@scope/also-bare/index.js': 'export {};',
    },
  });
  assert.throws(
    () => collectLicences({ root, servedBuildPackages: {} }),
    (error) => {
      assert.match(error.message, /bare@2\.0\.0/);
      assert.match(error.message, /@scope\/also-bare@3\.0\.0/);
      assert.doesNotMatch(error.message, /alpha@1\.0\.0/);
      return true;
    },
  );
});

test('a shipped package that is not installed fails', (t) => {
  const root = project(t, { lockPackages: { 'node_modules/ghost': { version: '1.0.0', license: 'MIT' } } });
  assert.throws(() => collectLicences({ root, servedBuildPackages: {} }), /ghost@1\.0\.0.*not installed/s);
});

test('LICENSE, LICENCE, COPYING and NOTICE files are read, whatever their case or extension', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/a': { version: '1.0.0', license: 'MIT' },
      'node_modules/b': { version: '1.0.0', license: 'MIT' },
      'node_modules/c': { version: '1.0.0', license: 'GPL-3.0-or-later' },
      'node_modules/d': { version: '1.0.0', license: '(MPL-2.0 OR Apache-2.0)' },
    },
    files: {
      'node_modules/a/license.md': 'TEXT-A',
      'node_modules/b/LICENSE.txt': 'TEXT-B',
      'node_modules/c/COPYING': 'TEXT-C',
      'node_modules/d/LICENSE': 'TEXT-D-APACHE',
      'node_modules/d/LICENSE-MPL': 'TEXT-D-MPL',
      'node_modules/d/NOTICE': 'TEXT-D-NOTICE',
    },
  });
  const { packages, text } = collectLicences({ root, servedBuildPackages: {} });
  for (const marker of ['TEXT-A', 'TEXT-B', 'TEXT-C', 'TEXT-D-APACHE', 'TEXT-D-MPL', 'TEXT-D-NOTICE']) {
    assert.ok(text.includes(marker), `${marker} is missing`);
  }
  // Several files in one package: each is labelled so a reader can tell them apart.
  assert.deepEqual(packages.find((p) => p.name === 'd').files.map((f) => f.name), ['LICENSE', 'LICENSE-MPL', 'NOTICE']);
  assert.ok(text.includes('[LICENSE-MPL]'));
});

test('source files and folders that merely start with "license" are not mistaken for a licence', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/tricky': { version: '1.0.0', license: 'MIT' } },
    files: {
      'node_modules/tricky/license.js': 'module.exports = "MIT";',
      'node_modules/tricky/license-checker.json': '{}',
      'node_modules/tricky/licenses/MIT.txt': MIT,
    },
  });
  assert.throws(() => collectLicences({ root, servedBuildPackages: {} }), /tricky@1\.0\.0/);
});

test('line endings are normalised and a byte-order mark inside a licence file is dropped', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/windows': { version: '1.0.0', license: 'MIT' } },
    files: { 'node_modules/windows/LICENSE': '\uFEFFLine one\r\nLine two\r\n\r\n' },
  });
  const { packages, text } = collectLicences({ root, servedBuildPackages: {} });
  assert.equal(packages[0].files[0].text, 'Line one\nLine two');
  assert.ok(!text.includes('\r'));
  assert.equal(text.indexOf('\uFEFF', 1), -1, 'only the file itself may start with a byte-order mark');
});

test('the file starts with a byte-order mark so browsers read it as UTF-8 on any host', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/accents': { version: '1.0.0', license: 'MIT' } },
    files: { 'node_modules/accents/LICENSE': 'Copyright (c) Clauderic Demers, Mike Kovařík' },
  });
  const { text } = collectLicences({ root, servedBuildPackages: {} });
  assert.equal(text[0], '\uFEFF');
  assert.ok(text.includes('Mike Kovařík'));
  assert.ok(text.endsWith('\n'));
});

test('the same inputs always give the same file', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/b': { version: '1.0.0', license: 'MIT' },
      'node_modules/a': { version: '1.0.0', license: 'MIT' },
    },
    files: { 'node_modules/a/LICENSE': 'A', 'node_modules/b/LICENSE': 'B' },
  });
  const first = collectLicences({ root, servedBuildPackages: {} }).text;
  assert.equal(collectLicences({ root, servedBuildPackages: {} }).text, first);
  assert.ok(first.indexOf('\na 1.0.0\n') < first.indexOf('\nb 1.0.0\n'), 'packages are sorted by name');
});

test('a compound licence expression is printed without its outer brackets', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/dual': { version: '1.0.0', license: '(MIT OR GPL-3.0-or-later)' },
      'node_modules/nested': { version: '1.0.0', license: '(MIT AND Zlib) OR (ISC)' },
    },
    files: { 'node_modules/dual/LICENSE': 'DUAL', 'node_modules/nested/LICENSE': 'NESTED' },
  });
  const { packages, text } = collectLicences({ root, servedBuildPackages: {} });
  assert.equal(packages[0].license, 'MIT OR GPL-3.0-or-later');
  assert.ok(text.includes('  dual 1.0.0 (MIT OR GPL-3.0-or-later)\n'));
  assert.ok(text.includes('\ndual 1.0.0\nLicence: MIT OR GPL-3.0-or-later\n'));
  // Brackets that group part of an expression are kept.
  assert.equal(packages[1].license, '(MIT AND Zlib) OR (ISC)');
});

test('the licence id comes from the package’s own package.json when the lockfile has none', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/modern': { version: '1.0.0' },
      'node_modules/legacy': { version: '1.0.0' },
    },
    files: {
      'node_modules/modern/LICENSE': 'MODERN',
      'node_modules/modern/package.json': JSON.stringify({ name: 'modern', license: 'ISC' }),
      'node_modules/legacy/LICENSE': 'LEGACY',
      'node_modules/legacy/package.json': JSON.stringify({ name: 'legacy', license: { type: 'BSD-3-Clause' } }),
    },
  });
  const { packages } = collectLicences({ root, servedBuildPackages: {} });
  assert.deepEqual(packages.map((p) => `${p.name} ${p.license}`), ['legacy BSD-3-Clause', 'modern ISC']);
});

test('a package that names no licence anywhere fails, even with a licence file', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/anonymous': { version: '1.0.0' } },
    files: {
      'node_modules/anonymous/LICENSE': 'SOME TEXT',
      'node_modules/anonymous/package.json': JSON.stringify({ name: 'anonymous' }),
    },
  });
  assert.throws(() => collectLicences({ root, servedBuildPackages: {} }), /anonymous@1\.0\.0 names no licence/);
});

test('an empty licence file, or one that is not UTF-8, fails', (t) => {
  const root = project(t, {
    lockPackages: {
      'node_modules/blank': { version: '1.0.0', license: 'MIT' },
      'node_modules/latin1': { version: '1.0.0', license: 'MIT' },
    },
    files: {
      'node_modules/blank/LICENSE': '\r\n\r\n',
      'node_modules/latin1/LICENSE': Buffer.from([0x43, 0x6f, 0x70, 0x79, 0x72, 0x69, 0x67, 0x68, 0x74, 0x20, 0xa9, 0x20, 0xe9]),
    },
  });
  assert.throws(
    () => collectLicences({ root, servedBuildPackages: {} }),
    (error) => /blank@1\.0\.0/.test(error.message) && /latin1@1\.0\.0/.test(error.message),
  );
});

// ---- Packages that publish no licence file ----

test('a reviewed fallback text stands in for a missing licence file, with its source stated', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/@scope/bare': { version: '2.0.0', license: 'MIT' } },
    files: {
      'node_modules/@scope/bare/index.js': 'export {};',
      'scripts/licence-fallbacks/@scope+bare@2.0.0.txt': 'FALLBACK TEXT\r\n',
    },
  });
  const { packages, text } = collectLicences({
    root,
    servedBuildPackages: {},
    fallbacks: { '@scope/bare@2.0.0': 'Copied from the README.' },
  });
  assert.equal(packages[0].files[0].text, 'FALLBACK TEXT');
  assert.ok(text.includes('FALLBACK TEXT'));
  assert.ok(text.includes('Copied from the README.'));
});

test('a fallback is tied to one version: a new version without a licence file fails again', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/bare': { version: '2.0.1', license: 'MIT' } },
    files: {
      'node_modules/bare/index.js': 'export {};',
      'scripts/licence-fallbacks/bare@2.0.0.txt': 'FALLBACK TEXT',
    },
  });
  assert.throws(
    () => collectLicences({ root, servedBuildPackages: {}, fallbacks: { 'bare@2.0.0': 'Copied from the README.' } }),
    /bare@2\.0\.1/,
  );
});

test('a fallback entry whose text file is missing fails', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/bare': { version: '2.0.0', license: 'MIT' } },
    files: { 'node_modules/bare/index.js': 'export {};' },
  });
  assert.throws(
    () => collectLicences({ root, servedBuildPackages: {}, fallbacks: { 'bare@2.0.0': 'Copied from the README.' } }),
    /bare@2\.0\.0 has a LICENCE_FALLBACKS entry but scripts\/licence-fallbacks\/bare@2\.0\.0\.txt is missing/,
  );
});

test('a package that ships its own licence file uses it, not the fallback', (t) => {
  const root = project(t, {
    lockPackages: { 'node_modules/alpha': { version: '1.0.0', license: 'MIT' } },
    files: {
      'node_modules/alpha/LICENSE': 'THE REAL ONE',
      'scripts/licence-fallbacks/alpha@1.0.0.txt': 'STALE COPY',
    },
  });
  const { text } = collectLicences({ root, servedBuildPackages: {}, fallbacks: { 'alpha@1.0.0': 'Old note.' } });
  assert.ok(text.includes('THE REAL ONE'));
  assert.ok(!text.includes('STALE COPY'));
});

// ---- Cross-checks the build runs against its own output ----

test('bundled module ids are mapped to the lockfile entry of the package they belong to', () => {
  const root = 'C:\\work\\app';
  const ids = [
    'C:/work/app/src/main.jsx',
    'C:/work/app/node_modules/react/index.js',
    'C:/work/app/node_modules/react/cjs/react.production.min.js',
    'C:\\work\\app\\node_modules\\@scope\\pkg\\dist\\index.mjs',
    'C:/work/app/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url',
    'C:/work/app/node_modules/outer/node_modules/@inner/dep/lib/x.js',
    '\0C:/work/app/node_modules/cjs-thing/index.js?commonjs-module',
    '\0vite/preload-helper.js',
    '\0rolldown/runtime.js',
  ];
  assert.deepEqual([...packagePathsOfModules(ids, root)].sort(), [
    'node_modules/@scope/pkg',
    'node_modules/cjs-thing',
    'node_modules/outer/node_modules/@inner/dep',
    'node_modules/pdfjs-dist',
    'node_modules/react',
  ]);
  // POSIX roots work the same way.
  assert.deepEqual(
    [...packagePathsOfModules(['/home/ci/app/node_modules/jszip/dist/jszip.min.js'], '/home/ci/app')],
    ['node_modules/jszip'],
  );
});

test('the Workbox packages inside a built service-worker runtime are read from its version markers', () => {
  const runtime = 'define(["exports"],function(t){try{self["workbox:core:7.4.0"]&&_()}catch(t){}' +
    'try{self["workbox:routing:7.4.0"]&&_()}catch(t){}try{self[\'workbox:cacheable-response:7.4.0\']&&_()}catch(t){}' +
    'try{self["workbox:core:7.4.0"]&&_()}catch(t){}});';
  assert.deepEqual(workboxPackagesIn(runtime), ['workbox-cacheable-response', 'workbox-core', 'workbox-routing']);
  assert.deepEqual(workboxPackagesIn('no markers here'), []);
});

// ---- This project, as installed ----

const realRoot = process.cwd();
const real = collectLicences({ root: realRoot });
const realLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const section = (name) => real.packages.find((p) => p.name === name);

test('the licences file is the one the site links to', () => {
  assert.equal(LICENCES_FILE, 'third-party-licenses.txt');
});

test('every production dependency of the site has its licence text in the file', () => {
  const { dependencies } = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const [name, version] of Object.entries(dependencies)) {
    const entry = section(name);
    assert.ok(entry, `${name} is a dependency but is not in ${LICENCES_FILE}`);
    assert.equal(entry.version, version);
    assert.ok(real.text.includes(`\n${name} ${version}\nLicence: ${entry.license}\n`), `${name} has no heading in the file`);
  }
});

test('every package the production install brings in is listed, and so is what the service worker serves', () => {
  const listed = new Set(real.packages.map((p) => p.path));
  for (const [path, entry] of Object.entries(realLock.packages)) {
    if (!path || entry.dev || entry.optional || entry.devOptional) continue;
    assert.ok(listed.has(path), `${path} ships but is not in ${LICENCES_FILE}`);
  }
  for (const name of Object.keys(SERVED_BUILD_PACKAGES)) {
    assert.ok(section(name), `${name} is served by the build but is not in ${LICENCES_FILE}`);
  }
  for (const name of ['workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies']) {
    assert.ok(name in SERVED_BUILD_PACKAGES, `${name} is part of the service worker runtime`);
  }
});

test('every listed package has a licence id and a real licence text, present in the file', () => {
  for (const pkg of real.packages) {
    assert.ok(pkg.license && pkg.license !== 'UNLICENSED', `${pkg.name}@${pkg.version} has no licence id`);
    assert.ok(pkg.files.length > 0, `${pkg.name}@${pkg.version} has no licence text`);
    for (const file of pkg.files) {
      assert.ok(file.text.length > 200, `${pkg.name}@${pkg.version}: ${file.name} is too short to be a licence`);
      // MIT/ISC/Apache say "permission", BSD says "permitted", the OFL and MPL say "license".
      assert.match(file.text, /permission|permitted|licen[cs]e/i, `${pkg.name}@${pkg.version}: ${file.name} does not read like a licence`);
      assert.ok(real.text.includes(file.text), `${pkg.name}@${pkg.version}: ${file.name} is not in the file`);
    }
  }
});

test('each package is listed once', () => {
  const keys = real.packages.map((p) => `${p.name}@${p.version}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('every fallback text is still needed: its package ships and publishes no licence file', () => {
  for (const key of Object.keys(LICENCE_FALLBACKS)) {
    const pkg = real.packages.find((p) => `${p.name}@${p.version}` === key);
    assert.ok(pkg, `${key} has a fallback text but is no longer shipped at that version; remove it`);
    assert.ok(pkg.fallback, `${key} now publishes its own licence file; remove the fallback`);
  }
});

test('the isarray fallback is the licence printed in the package’s own README', () => {
  const readme = readFileSync('node_modules/isarray/README.md', 'utf8').replace(/\r\n/g, '\n');
  const fromReadme = readme
    .slice(readme.indexOf('## License') + '## License'.length)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
  assert.equal(section('isarray').files[0].text, fromReadme);
});

test('the fontkit fallback is byte for byte the LICENSE of the project it is forked from', () => {
  // git's blob id of foliojs/fontkit's LICENSE at commit d65a577 ("Add LICENSE file").
  const upstreamBlob = '34d142021809672bcbbd880ec9c8957d9c474dd2';
  const text = `${section('@pdf-lib/fontkit').files[0].text}\n`;
  const blob = createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0${text}`).digest('hex');
  assert.equal(blob, upstreamBlob);
});
