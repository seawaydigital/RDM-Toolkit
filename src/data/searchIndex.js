/**
 * Site search across tools, common tasks, informational pages and glossary
 * terms. Pure data —
 * SearchBar.jsx renders the results; tests/searchIndex.test.mjs covers ranking.
 *
 * Result: { kind: 'tool' | 'task' | 'page' | 'term', id, title, description, hash, emoji }
 */
import { ALL_TOOLS } from './toolRegistry.js';
import { WORKFLOWS, stepHash } from './workflows.js';
import { PAGE_META } from './pages.js';
import { GLOSSARY } from './glossary.js';
import { buildHash } from '../utils/route.js';

export const MAX_RESULTS = 10;

// Slots each kind is guaranteed when it has matches, so a broad query such as
// "pdf" (17 tools) still surfaces the matching tasks and guides. Unused slots
// are handed back in kind order.
const KIND_ORDER = ['tool', 'task', 'page', 'term'];
const QUOTA = { tool: 6, task: 2, page: 2, term: 2 };

const INDEX = [
  ...ALL_TOOLS.map(tool => ({
    kind: 'tool',
    id: tool.id,
    title: tool.name,
    description: tool.description,
    hash: tool.id,
    emoji: tool.categoryEmoji,
    haystack: [tool.name, tool.description, tool.categoryLabel, ...(tool.tags || [])],
  })),
  ...WORKFLOWS.map(w => ({
    kind: 'task',
    id: w.id,
    title: w.title,
    description: w.summary,
    hash: stepHash(w, 1),
    emoji: '🧭',
    haystack: [w.title, w.summary, ...(w.keywords || [])],
  })),
  ...PAGE_META.filter(p => p.searchable !== false).map(p => ({
    kind: 'page',
    id: p.hash,
    title: p.title,
    description: p.description,
    hash: p.hash,
    emoji: '📖',
    haystack: [p.title, p.description, ...(p.keywords || [])],
  })),
  ...GLOSSARY.map(t => ({
    kind: 'term',
    id: t.id,
    title: t.term,
    description: t.definition,
    hash: buildHash('glossary', { term: t.id }),
    emoji: '🔤',
    haystack: [t.term, ...(t.aka || [])],
  })),
].map(entry => ({ ...entry, haystack: entry.haystack.filter(Boolean).join(' \u0000 ').toLowerCase() }));

export function searchAll(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];

  const byKind = Object.fromEntries(KIND_ORDER.map(kind => [kind, []]));
  for (const entry of INDEX) {
    if (entry.haystack.includes(q)) byKind[entry.kind].push(entry);
  }

  const take = Object.fromEntries(KIND_ORDER.map(kind => [kind, Math.min(byKind[kind].length, QUOTA[kind])]));
  let spare = MAX_RESULTS - Object.values(take).reduce((a, b) => a + b, 0);
  for (const kind of KIND_ORDER) {
    const extra = Math.min(spare, byKind[kind].length - take[kind]);
    take[kind] += extra;
    spare -= extra;
  }

  return KIND_ORDER.flatMap(kind =>
    byKind[kind].slice(0, take[kind]).map(({ haystack, ...result }) => result),
  );
}
