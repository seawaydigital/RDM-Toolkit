// In-page scrolling for a hash-routed app: "#section" links would be read as
// routes, so pages scroll with buttons instead. Moves focus to the target
// (give it tabIndex={-1}) so keyboard and screen-reader users land there too.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
  return true;
}
