import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DEFAULT_ASSET_DIR = 'dist/assets';

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

function hashFile(filePath, algorithm) {
  return createHash(algorithm).update(readFileSync(filePath)).digest('base64');
}

function readBundle(assetDir = DEFAULT_ASSET_DIR) {
  if (!existsSync(assetDir)) {
    throw new Error(`${assetDir} does not exist. Run a production build first.`);
  }

  const files = readdirSync(assetDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const filePath = join(assetDir, file);
      const bytes = statSync(filePath).size;
      return {
        name: file,
        logicalName: stripHash(file),
        bytes,
        gzipBytes: gzipSync(readFileSync(filePath), { level: 9 }).length,
        sha256: hashFile(filePath, 'sha256'),
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
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function compareBundles(base, current, maxGrowthPct) {
  const baseByLogicalName = new Map(base.files.map((file) => [file.logicalName, file]));
  const issues = [];

  for (const file of current.files) {
    const baseline = baseByLogicalName.get(file.logicalName);
    if (!baseline) {
      issues.push(`new JS chunk ${file.logicalName} (${file.name})`);
      continue;
    }

    if (baseline.bytes === 0) continue;
    const growthPct = ((file.bytes - baseline.bytes) / baseline.bytes) * 100;
    const growthBytes = file.bytes - baseline.bytes;
    if (growthPct > maxGrowthPct && growthBytes > 10 * 1024) {
      issues.push(
        `${file.logicalName} grew by ${growthPct.toFixed(1)}% (${baseline.bytes} -> ${file.bytes} bytes)`,
      );
    }
  }

  return issues;
}

const maxGrowthPct = Number(getArg('--max-growth-pct', '10'));

if (hasArg('--compare')) {
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
