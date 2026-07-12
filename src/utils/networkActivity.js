/**
 * Classifies a resource-timing entry URL as outbound (left the device for
 * another origin) or local. Used by the live "network silence" indicator.
 *
 * Conservative by design: anything that isn't provably same-origin or a
 * purely local scheme (blob:/data:/about:) counts as outbound.
 */
export function isOutboundRequest(url, appOrigin) {
  if (/^(blob|data|about):/i.test(url)) return false;
  try {
    return new URL(url, appOrigin).origin !== appOrigin;
  } catch {
    return true;
  }
}
