import { FileText, ShieldCheck, Download, CloudOff } from 'lucide-react';

/**
 * Animated privacy-flow diagram for the homepage hero.
 * Your file → This browser → Your download, with a crossed-out cloud below.
 * Animation classes (.homepage-diagram-wire, .homepage-diagram-strike) are
 * pure CSS and frozen under prefers-reduced-motion (see global.css).
 */
export default function HeroDiagram() {
  return (
    <div
      className="homepage-diagram"
      role="img"
      aria-label="Diagram: your file is processed by your browser and downloaded — no server is ever involved"
    >
      <span className="homepage-diagram-live" aria-hidden="true">● LIVE ON YOUR DEVICE</span>

      <div className="homepage-diagram-row" aria-hidden="true">
        <div className="homepage-diagram-node">
          <span className="homepage-diagram-icon"><FileText size={22} /></span>
          <span className="homepage-diagram-label">Your file</span>
        </div>

        <svg className="homepage-diagram-wire" viewBox="0 0 100 8" preserveAspectRatio="none">
          <line x1="0" y1="4" x2="100" y2="4" />
        </svg>

        <div className="homepage-diagram-node homepage-diagram-node--device">
          <span className="homepage-diagram-icon"><ShieldCheck size={22} /></span>
          <span className="homepage-diagram-label">This browser</span>
        </div>

        <svg className="homepage-diagram-wire homepage-diagram-wire--second" viewBox="0 0 100 8" preserveAspectRatio="none">
          <line x1="0" y1="4" x2="100" y2="4" />
        </svg>

        <div className="homepage-diagram-node">
          <span className="homepage-diagram-icon"><Download size={22} /></span>
          <span className="homepage-diagram-label">Your download</span>
        </div>
      </div>

      <div className="homepage-diagram-cloud" aria-hidden="true">
        <span className="homepage-diagram-cloud-icon">
          <CloudOff size={18} />
          <svg className="homepage-diagram-strike" viewBox="0 0 40 40" preserveAspectRatio="none">
            <line x1="4" y1="36" x2="36" y2="4" />
          </svg>
        </span>
        <span className="homepage-diagram-cloud-label">No server. No upload. The internet is not involved.</span>
      </div>
    </div>
  );
}
