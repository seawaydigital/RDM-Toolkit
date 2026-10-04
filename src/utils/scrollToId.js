// In-page scrolling for a hash-routed app: "#section" links would be read as
// routes, so pages scroll with buttons instead. Moves focus to the target
// (give it tabIndex={-1}) so keyboard and screen-reader users land there too.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pass { smooth: false } when arriving from a link: jump straight there.
export function scrollToId(id, { smooth = true } = {}) {
  const el = document.getElementById(id);
  if (!el) return false;
  const animate = smooth && !prefersReducedMotion();
  el.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'start' });
  el.focus({ preventScroll: true });
  return true;
}
