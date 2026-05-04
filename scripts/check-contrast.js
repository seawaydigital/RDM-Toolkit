// WCAG 2.x contrast ratio computation.
// Refs:
//   https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
//   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance

// Audit driver imports — only used when running this file directly.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function srgbChannel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance({ r, g, b }) {
  return (
    0.2126 * srgbChannel(r) +
    0.7152 * srgbChannel(g) +
    0.0722 * srgbChannel(b)
  );
}

export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Composite an rgba foreground over a solid rgb background.
// Per CSS Color Module: out = fg.alpha * fg + (1 - fg.alpha) * bg
function composite(fg, alpha, bg) {
  return {
    r: Math.round(alpha * fg.r + (1 - alpha) * bg.r),
    g: Math.round(alpha * fg.g + (1 - alpha) * bg.g),
    b: Math.round(alpha * fg.b + (1 - alpha) * bg.b),
  };
}

// Parse "#RGB", "#RRGGBB", or "rgba(R, G, B, A)" into an rgb object.
// rgba is composited over the optional `bg` (defaults to white).
export function parseColorValue(value, bg = { r: 255, g: 255, b: 255 }) {
  const v = value.trim();
  if (v.startsWith('#')) return hexToRgb(v);
  const rgbaMatch = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const fg = { r: +r, g: +g, b: +b };
    const alpha = a == null ? 1 : parseFloat(a);
    if (alpha === 1) return fg;
    return composite(fg, alpha, bg);
  }
  throw new Error(`Unsupported color value: ${value}`);
}

// Audit driver — run with `node scripts/check-contrast.js`
// Reads global.css, extracts CSS variable values, and reports
// which combinations actually used in code fail WCAG AA.

// Windows-safe main-module guard — paths with spaces, drive letters, etc.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = await readFile('src/styles/global.css', 'utf8');

  const tokens = {};
  // Extract --foo: #bar; or --foo: rgba(...);
  for (const match of css.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }

  // Combinations to audit — text on each background.
  const FG_TOKENS = ['text-primary', 'text-secondary', 'text-muted', 'text-parchment', 'accent-primary'];
  const BG_TOKENS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-card', 'bg-inset'];
  const AA_NORMAL = 4.5;
  const AA_LARGE = 3.0;

  console.log('# Contrast audit\n');
  console.log('| Foreground | Background | Ratio | AA normal (4.5) | AA large (3.0) |');
  console.log('|---|---|---|---|---|');

  let failures = 0;
  for (const fg of FG_TOKENS) {
    for (const bg of BG_TOKENS) {
      const fgVal = tokens[fg];
      const bgVal = tokens[bg];
      if (!fgVal || !bgVal) continue;
      try {
        const bgRgb = parseColorValue(bgVal);
        const fgRgb = parseColorValue(fgVal, bgRgb);
        const ratio = contrastRatio(fgRgb, bgRgb);
        const passN = ratio >= AA_NORMAL ? '✅' : '❌';
        const passL = ratio >= AA_LARGE ? '✅' : '❌';
        if (ratio < AA_NORMAL) failures++;
        console.log(
          `| --${fg} | --${bg} | ${ratio.toFixed(2)} | ${passN} | ${passL} |`,
        );
      } catch (e) {
        console.log(`| --${fg} | --${bg} | ERROR | ${e.message} | |`);
      }
    }
  }
  console.log(`\nTotal AA-normal failures: ${failures}`);
  if (failures > 0 && process.argv.includes('--strict')) process.exit(1);
}
