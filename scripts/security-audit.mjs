import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const rel = (p) => path.relative(ROOT, p).replaceAll(path.sep, '/');
const fromRoot = (...parts) => path.join(ROOT, ...parts);

const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, exts, out);
    } else if (exts.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function lineReports(file, pattern, label, allowFile = () => false) {
  const relative = rel(file);
  if (allowFile(relative)) return;
  readText(file).split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      fail(`${relative}:${index + 1} contains forbidden ${label}`);
    }
  });
}

const bannedPackages = [
  '@imgly/background-removal',
  'mammoth',
  'xlsx',
  'onnxruntime-web',
  'protobufjs',
  '@xmldom/xmldom',
  'vite-plugin-static-copy',
];

const allowedDependencies = new Map([
  ['@cantoo/pdf-lib', '1.21.1'],
  ['@dnd-kit/core', '6.3.1'],
  ['@dnd-kit/sortable', '8.0.0'],
  ['@dnd-kit/utilities', '3.2.2'],
  ['@fontsource/fraunces', '5.2.9'],
  ['@fontsource/ibm-plex-mono', '5.2.7'],
  ['@fontsource/ibm-plex-sans', '5.2.8'],
  ['@pdf-lib/fontkit', '1.1.1'],
  ['dompurify', '3.4.1'],
  ['exifr', '7.1.3'],
  ['jszip', '3.10.1'],
  ['lucide-react', '0.577.0'],
  ['pdfjs-dist', '5.6.205'],
  ['react', '18.3.1'],
  ['react-dom', '18.3.1'],
  ['turndown', '7.2.4'],
  ['turndown-plugin-gfm', '1.0.2'],
  ['zxcvbn', '4.4.2'],
]);

const allowedDevDependencies = new Map([
  ['@vitejs/plugin-react', '4.7.0'],
  ['vite', '5.4.21'],
  ['vite-plugin-pwa', '1.2.0'],
]);

function assertAllowedDependencySet(sectionName, actual = {}, allowed) {
  for (const [name, version] of Object.entries(actual)) {
    const expected = allowed.get(name);
    if (!expected) {
      fail(`package.json ${sectionName} includes unreviewed dependency ${name}`);
      continue;
    }
    if (version !== expected) {
      fail(`package.json ${sectionName} pins ${name} to ${version}; expected exact ${expected}`);
    }
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
      fail(`package.json ${sectionName} dependency ${name} must use an exact version, not ${version}`);
    }
  }
  for (const name of allowed.keys()) {
    if (!Object.prototype.hasOwnProperty.call(actual, name)) {
      fail(`package.json ${sectionName} is missing allowed dependency ${name}`);
    }
  }
}

const packageJson = JSON.parse(readText(fromRoot('package.json')));
assertAllowedDependencySet('dependencies', packageJson.dependencies, allowedDependencies);
assertAllowedDependencySet('devDependencies', packageJson.devDependencies, allowedDevDependencies);

if (packageJson.engines?.node !== '>=24 <25') {
  fail('package.json must pin the supported Node runtime to >=24 <25');
}
if (packageJson.engines?.npm !== '>=10 <12') {
  fail('package.json must pin the supported npm runtime to >=10 <12');
}
if (packageJson.scripts?.['bundle:integrity'] !== 'node scripts/bundle-integrity.mjs') {
  fail('package.json must expose bundle:integrity for build artifact monitoring');
}
if (!fs.existsSync(fromRoot('scripts', 'bundle-integrity.mjs'))) {
  fail('scripts/bundle-integrity.mjs is missing');
}

const nvmrcPath = fromRoot('.nvmrc');
if (!fs.existsSync(nvmrcPath) || readText(nvmrcPath).trim() !== '24') {
  fail('.nvmrc must pin CI and local development to Node 24');
}

const npmrcPath = fromRoot('.npmrc');
if (!fs.existsSync(npmrcPath) || !/^ignore-scripts=true$/m.test(readText(npmrcPath))) {
  fail('.npmrc must set ignore-scripts=true');
}

for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  const deps = packageJson[section] || {};
  for (const name of bannedPackages) {
    if (Object.prototype.hasOwnProperty.call(deps, name)) {
      fail(`package.json ${section} includes banned package ${name}`);
    }
  }
}

const lockPath = fromRoot('package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(readText(lockPath));
  const lockPackages = Object.keys(lock.packages || {});
  for (const name of bannedPackages) {
    const lockKey = `node_modules/${name}`;
    if (lockPackages.includes(lockKey)) {
      fail(`package-lock.json includes banned package ${name}`);
    }
  }
}

const workflowDir = fromRoot('.github', 'workflows');
const workflowFiles = walk(workflowDir, ['.yml', '.yaml']);
if (!fs.existsSync(fromRoot('.github', 'workflows', 'scorecard.yml'))) {
  fail('.github/workflows/scorecard.yml is missing; OpenSSF Scorecard should run weekly');
}
for (const file of workflowFiles) {
  const lines = readText(file).split(/\r?\n/);
  lines.forEach((line, index) => {
    const uses = line.match(/\buses:\s*([^#\s]+)/);
    if (uses) {
      const actionRef = uses[1];
      const isLocalAction = actionRef.startsWith('./') || actionRef.startsWith('../');
      if (!isLocalAction && !/@[a-f0-9]{40}$/.test(actionRef)) {
        fail(`${rel(file)}:${index + 1} uses an action that is not pinned to a full commit SHA`);
      }
    }

    if (/\bnpm ci\b/.test(line) && !/--ignore-scripts\b/.test(line)) {
      fail(`${rel(file)}:${index + 1} runs npm ci without --ignore-scripts`);
    }
    if (/\bnpx\s+/.test(line)) {
      fail(`${rel(file)}:${index + 1} uses npx, which can fetch code during CI`);
    }
    if (/\bnode-version:/.test(line)) {
      fail(`${rel(file)}:${index + 1} pins Node inline instead of using .nvmrc`);
    }
  });
}

const { ALL_TOOLS } = await import(pathToFileURL(fromRoot('src/data/toolRegistry.js')).href);
const registryIds = new Set(ALL_TOOLS.map((tool) => tool.id));
const appSource = readText(fromRoot('src/App.jsx'));
const appToolEntries = [...appSource.matchAll(/^\s*'([^']+)':\s*lazy\(\(\)\s*=>\s*import\('\.\/tools\/([^']+\.jsx)'\)\),?/gm)];
const appIds = new Set(appToolEntries.map((match) => match[1]));
const importedToolFiles = new Set(appToolEntries.map((match) => `src/tools/${match[2]}`));

for (const id of registryIds) {
  if (!appIds.has(id)) fail(`toolRegistry id "${id}" is not lazy-loaded in App.jsx`);
}
for (const id of appIds) {
  if (!registryIds.has(id)) fail(`App.jsx lazy-loads unregistered tool id "${id}"`);
}

const actualToolFiles = walk(fromRoot('src/tools'), ['.jsx']).map(rel);
for (const file of actualToolFiles) {
  if (!importedToolFiles.has(file)) {
    fail(`${file} is under src/tools but is not registered/lazy-loaded`);
  }
}
for (const file of importedToolFiles) {
  if (!fs.existsSync(fromRoot(file))) {
    fail(`App.jsx imports missing tool file ${file}`);
  }
}

const sourceFiles = [
  ...walk(fromRoot('src/components'), ['.js', '.jsx']),
  ...walk(fromRoot('src/hooks'), ['.js', '.jsx']),
  ...walk(fromRoot('src/tools'), ['.js', '.jsx']),
  ...walk(fromRoot('src/utils'), ['.js', '.jsx']),
];

const allowedDangerousHtml = new Set([
  'src/components/ui/HowItWorks.jsx',
  'src/tools/text/FileToMarkdown.jsx',
  'src/tools/text/MarkdownPreview.jsx',
]);

const allowedLocalStorage = new Set([
  'src/components/ui/ClearLocalData.jsx', // wipe-only: clears storage, never writes
  'src/components/ui/SearchBar.jsx',
  'src/components/ui/WelcomeTour.jsx',
  'src/hooks/useRecentTools.js',
  'src/hooks/useUsageLog.js',
]);

for (const file of sourceFiles) {
  for (const name of bannedPackages) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    lineReports(
      file,
      new RegExp(`\\bfrom\\s+['"]${escaped}['"]|\\bimport\\(\\s*['"]${escaped}['"]\\s*\\)`, 'i'),
      `banned package import (${name})`,
    );
  }
  lineReports(file, /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, 'runtime network API');
  lineReports(file, /\b(navigator\.)?sendBeacon\s*\(/, 'beacon API');
  lineReports(file, /\beval\s*\(|\bnew Function\s*\(/, 'dynamic code execution');
  lineReports(file, /\bdocument\.cookie\b|\bindexedDB\b/, 'persistent browser storage API');
  lineReports(file, /\.(innerHTML|outerHTML)\b|insertAdjacentHTML\s*\(/, 'raw HTML mutation');
  lineReports(file, /dangerouslySetInnerHTML/, 'React HTML injection', (relative) => allowedDangerousHtml.has(relative));
  lineReports(file, /\blocalStorage\b|\bsessionStorage\b/, 'local/session storage', (relative) => allowedLocalStorage.has(relative));
  lineReports(file, /ALLOWED_ATTR\s*:\s*\[[^\]]*['"]style['"]/, 'DOMPurify style attribute allowlist');

  const lines = readText(file).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/target=(?:"_blank"|\{[^}]*'_blank'[^}]*\})/.test(line)) return;
    const nearby = lines.slice(index, index + 4).join('\n');
    if (!/rel=(?:"noopener noreferrer"|\{[^}]*noopener noreferrer[^}]*\})/.test(nearby)) {
      fail(`${rel(file)}:${index + 1} opens a new tab without rel="noopener noreferrer" nearby`);
    }
  });
}

const explainerPath = fromRoot('src/data/toolExplainers.js');
if (fs.existsSync(explainerPath)) {
  const explainer = readText(explainerPath);
  for (const pattern of [/<script\b/i, /\son\w+=/i, /javascript:/i, /data:text\/html/i]) {
    if (pattern.test(explainer)) {
      fail(`src/data/toolExplainers.js contains potentially executable HTML: ${pattern}`);
    }
  }
}

const headersPath = fromRoot('public/_headers');
if (!fs.existsSync(headersPath)) {
  fail('public/_headers is missing; hosts that support real headers need this file');
} else {
  const headers = readText(headersPath).toLowerCase();
  for (const required of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'x-frame-options',
  ]) {
    if (!headers.includes(required)) fail(`public/_headers is missing ${required}`);
  }
  if (!headers.includes("frame-ancestors 'none'")) {
    fail("public/_headers CSP must include frame-ancestors 'none'");
  }
  if (!headers.includes("object-src 'none'")) {
    fail("public/_headers CSP must include object-src 'none'");
  }
}

const indexHtml = readText(fromRoot('index.html')).toLowerCase();
if (!indexHtml.includes('content-security-policy')) {
  fail('index.html is missing the fallback meta CSP');
}
if (indexHtml.includes("'unsafe-eval'")) {
  fail("index.html CSP must not allow 'unsafe-eval'");
}

const viteConfig = readText(fromRoot('vite.config.js'));
if (!viteConfig.includes('distSubresourceIntegrity')) {
  fail('vite.config.js must inject SRI attributes into the production build');
}

if (failures.length > 0) {
  console.error('Security audit failed:\n');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Security audit passed for ${ALL_TOOLS.length} registered tools.`);
