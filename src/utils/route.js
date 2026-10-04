// Hash routing: "#<path>?<query>". The path is a tool id or a page hash; the
// query carries optional state such as task progress (?task=…&step=…) or a
// glossary term (?term=…). Kept free of React and the DOM so node can test it.

export function parseHash(hash, { pages, toolIds }) {
  const raw = (hash || '').replace(/^#/, '');
  const queryStart = raw.indexOf('?');
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart);
  const query = queryStart === -1 ? '' : raw.slice(queryStart + 1);
  if (!path) return { page: null, toolId: null, params: {} };

  const isPage = pages.has(path);
  const isTool = !isPage && toolIds.has(path);
  if (!isPage && !isTool) return { page: null, toolId: null, params: {} };

  const params = Object.fromEntries(new URLSearchParams(query));
  return { page: isPage ? path : null, toolId: isTool ? path : null, params };
}

export function buildHash(path, params = {}) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);
  if (entries.length === 0) return path;
  return `${path}?${new URLSearchParams(entries).toString()}`;
}
