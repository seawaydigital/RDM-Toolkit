import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { isOutboundRequest } from '../../utils/networkActivity';

/**
 * Live "network silence" indicator. Counts every request the browser has made
 * to a different origin since the page loaded, using the Resource Timing API.
 * Same-origin loads (the app's own code, fonts, icons) and local blob:/data:
 * URLs created by tools are not counted — the claim being demonstrated is
 * "nothing leaves your device for someone else's server."
 */
export default function NetworkSilence() {
  const [outbound, setOutbound] = useState(0);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') {
      setSupported(false);
      return undefined;
    }
    const origin = window.location.origin;
    const count = (entries) =>
      entries.filter((e) => isOutboundRequest(e.name, origin)).length;

    // Everything since page load, then live updates for new requests.
    setOutbound(count(performance.getEntriesByType('resource')));
    const observer = new PerformanceObserver((list) => {
      const fresh = count(list.getEntries());
      if (fresh > 0) setOutbound((n) => n + fresh);
    });
    try {
      observer.observe({ type: 'resource', buffered: false });
    } catch {
      setSupported(false);
    }
    return () => observer.disconnect();
  }, []);

  if (!supported) return null;

  const silent = outbound === 0;
  return (
    <div
      className={`htw-netsilence${silent ? '' : ' htw-netsilence--active'}`}
      role="status"
      aria-live="polite"
    >
      {silent ? <ShieldCheck size={22} aria-hidden="true" /> : <ShieldAlert size={22} aria-hidden="true" />}
      <div>
        <strong>
          {silent
            ? 'Live check: 0 requests to other servers since this page loaded.'
            : `Live check: ${outbound} request${outbound === 1 ? '' : 's'} to another origin detected.`}
        </strong>
        <p>
          Your browser keeps its own log of every network request — this counter reads
          that log right now, on your device. Loads of the app&apos;s own code from this
          site don&apos;t count; what&apos;s counted is any request that leaves for a
          different server. The Content-Security-Policy blocks those outright, so this
          number should stay at zero no matter which tools you use.
        </p>
      </div>
    </div>
  );
}
