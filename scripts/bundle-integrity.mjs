import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DEFAULT_ASSET_DIR = 'dist/assets';
const ROOT = resolve(process.cwd());
const TMP_ROOT = resolve(tmpdir());

function getArg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function stripHash(fileName) {
  const match = fileName.match(/^(.+)-[A-Za-z0-9_-]{8,}(\.js)$/);
  return match ? `${match[1]}${match[2]}` : fileName;
}

function resolveWorkspacePath(input, label) {
  if (!input || input.includes('\0')) {
    throw new Error(`${label} must be a path inside the workspace or system temp directory`);
  }
  const resolved = isAbsolute(input) ? resolve(input) : resolve(ROOT, input);
  const inWorkspace = resolved === ROOT || resolved.startsWith(`${ROOT}${sep}`);
  const inTemp = resolved === TMP_ROOT || resolved.startsWith(`${TMP_ROOT}${sep}`);
  if (!inWorkspace && !inTemp) {
    throw new Error(`${label} must stay inside the workspace or system temp directory`);
  }
  return resolved;
}

function hashBytes(bytes, algorithm) {
  return createHash(algorithm).update(bytes).digest('base64');
}

function readBundle(assetDir = DEFAULT_ASSET_DIR) {
  const resolvedAssetDir = resolveWorkspacePath(assetDir, 'asset directory');
  let assetNames;
  try {
    assetNames = readdirSync(resolvedAssetDir);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(`${assetDir} does not exist. Run a production build first.`);
  }

  const files = assetNames
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      if (!/^[A-Za-z0-9._-]+\.js$/.test(file)) {
        throw new Error(`Unexpected JS asset name: ${file}`);
      }
      const filePath = resolve(resolvedAssetDir, file);
      const fileBytes = readFileSync(filePath);
      return {
        name: file,
        logicalName: stripHash(file),
        bytes: fileBytes.length,
        gzipBytes: gzipSync(fileBytes, { level: 9 }).length,
        sha256: hashBytes(fileBytes, 'sha256'),
      };
    })
    .sort((a, b) => a.logicalName.localeCompare(b.logicalName));

  return {
    files,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    totalGzipBytes: files.reduce((sum, file) => sum + file.gzipBytes, 0),
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(resolveWorkspacePath(filePath, 'JSON path'), 'utf8'));
}

// One-time transition allowance for the Vite 5 (Rollup) -> Vite 8 (Rolldown)
// bundler migration: Rolldown always emits a shared runtime-helpers chunk when
// manual chunking is used (see rolldown docs, "Why there's always a runtime.js
// chunk?") — there is no option to inline it. Exact logical-name match only.
// This entry becomes inert once master's own baseline is a Rolldown build;
// remove it in a later cleanup pass.
const TRANSITION_ALLOWED_NEW_CHUNKS = new Set(['rolldown-runtime.js']);

// Stripping the content hash is not injective: several distinct chunks can share
// one logical name. The app entry (index.html -> index-<hash>.js) and React's own
// index.js both reduce to `index.js`. Keying a Map on the logical name silently
// kept whichever chunk happened to sort last, so a hash reshuffle could compare
// the 8 KB React chunk against the 489 KB entry and report a 5827% regression
// (or, in the other direction, hide a real one). Compare the summed size of every
// chunk sharing a logical name instead — stable whatever order the files arrive in.
function groupByLogicalName(files) {
  const groups = new Map();
  for (const file of files) {
    const group = groups.get(file.logicalName);
    if (group) {
      group.bytes += file.bytes;
      group.names.push(file.name);
    } else {
      groups.set(file.logicalName, { bytes: file.bytes, names: [file.name] });
    }
  }
  return groups;
}

export function compareBundles(base, current, maxGrowthPct) {
  const baseGroups = groupByLogicalName(base.files);
  const currentGroups = groupByLogicalName(current.files);
  const issues = [];

  for (const [logicalName, group] of currentGroups) {
    const baseline = baseGroups.get(logicalName);
    if (!baseline) {
      if (TRANSITION_ALLOWED_NEW_CHUNKS.has(logicalName)) continue;
      issues.push(`new JS chunk ${logicalName} (${group.names.join(', ')})`);
      continue;
    }

    if (baseline.bytes === 0) continue;
    const growthPct = ((group.bytes - baseline.bytes) / baseline.bytes) * 100;
    const growthBytes = group.bytes - baseline.bytes;
    if (growthPct > maxGrowthPct && growthBytes > 10 * 1024) {
      const chunkCount = group.names.length > 1 ? ` across ${group.names.length} chunks` : '';
      issues.push(
        `${logicalName} grew by ${growthPct.toFixed(1)}%${chunkCount} ` +
          `(${baseline.bytes} -> ${group.bytes} bytes)`,
      );
    }
  }

  return issues;
}

const maxGrowthPct = Number(getArg('--max-growth-pct', '10'));
const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (!invokedDirectly) {
  // Imported (by tests): expose compareBundles without running the CLI.
} else if (hasArg('--compare')) {
  const basePath = getArg('--compare');
  const currentPath = getArg('--current');
  if (!basePath) throw new Error('--compare requires a baseline JSON path');

  const base = readJson(basePath);
  const current = currentPath ? readJson(currentPath) : readBundle(getArg('--asset-dir', DEFAULT_ASSET_DIR));
  const issues = compareBundles(base, current, maxGrowthPct);

  if (issues.length > 0) {
    console.error('Bundle integrity check failed:');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log('Bundle integrity check passed.');
} else {
  process.stdout.write(JSON.stringify(readBundle(getArg('--asset-dir', DEFAULT_ASSET_DIR)), null, 2));
}
