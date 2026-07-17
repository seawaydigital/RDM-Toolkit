import { AlertTriangle } from 'lucide-react';
import { getCaveats } from '../../data/toolExplainers';

/**
 * Always-visible pre-use caveats for tools with high-impact gotchas
 * (feature loss, workflow-order advice, compliance-critical caveats).
 * Renders nothing for tools without an entry in TOOL_CAVEATS.
 * Wired globally in App.jsx between the tool header and the tool body.
 */
export default function ToolCaveats({ toolId }) {
  const caveats = getCaveats(toolId);
  if (!caveats) return null;

  return (
    <aside className="tool-caveats" aria-label="Before you use this tool">
      <p className="tool-caveats-title">
        <AlertTriangle size={14} aria-hidden="true" />
        Before you use this tool
      </p>
      <ul className="tool-caveats-list">
        {caveats.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </aside>
  );
}
