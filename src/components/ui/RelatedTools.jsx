import { ALL_TOOLS } from '../../data/toolRegistry';

export default function RelatedTools({ toolId, onNavigate }) {
  const currentTool = ALL_TOOLS.find(t => t.id === toolId);
  const relatedIds = currentTool?.related;

  if (!relatedIds || relatedIds.length === 0) return null;

  const relatedTools = relatedIds
    .map(id => ALL_TOOLS.find(t => t.id === id))
    .filter(Boolean);

  if (relatedTools.length === 0) return null;

  return (
    <div className="related-tools">
      <h2 className="related-tools-title">
        You might also need
        <span className="related-tools-count">{relatedTools.length} · suggested</span>
      </h2>
      <ul className="related-tools-row">
        {relatedTools.map(tool => {
          const desc = tool.description.length > 60
            ? tool.description.slice(0, 57) + '…'
            : tool.description;
          return (
            <li key={tool.id}>
              <button
                className="related-tools-card"
                onClick={() => onNavigate(tool.id)}
                type="button"
              >
                <span className="related-tools-emoji">{tool.categoryEmoji}</span>
                <span className="related-tools-name">{tool.name}</span>
                <span className="related-tools-desc">{desc}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
