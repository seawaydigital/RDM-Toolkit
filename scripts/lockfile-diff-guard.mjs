import { execFileSync } from 'node:child_process';

const [base, head = 'HEAD'] = process.argv.slice(2);

if (!base) {
  console.error('Usage: node scripts/lockfile-diff-guard.mjs <base-ref> [head-ref]');
  process.exit(2);
}

const changed = execFileSync('git', ['diff', '--name-only', base, head], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);

const lockChanged = changed.includes('package-lock.json');
const packageChanged = changed.includes('package.json');

if (lockChanged && !packageChanged) {
  console.error('package-lock.json changed without package.json. Refusing undisclosed dependency graph changes.');
  process.exit(1);
}

console.log('Lockfile diff guard passed.');
