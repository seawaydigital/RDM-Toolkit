export default function ToolSkeleton() {
  return (
    <div className="tool-skeleton" aria-hidden="true" aria-busy="true" aria-label="Loading tool…">
      {/* InfoCard area */}
      <div className="tool-skeleton-block tool-skeleton-info">
        <div className="tool-skeleton-line tool-skeleton-line--wide" />
        <div className="tool-skeleton-line tool-skeleton-line--medium" />
        <div className="tool-skeleton-badges">
          <div className="tool-skeleton-pill" />
          <div className="tool-skeleton-pill" />
          <div className="tool-skeleton-pill" />
        </div>
      </div>

      {/* DropZone area */}
      <div className="tool-skeleton-block tool-skeleton-dropzone" />

      {/* Action button */}
      <div className="tool-skeleton-block tool-skeleton-button" />
    </div>
  );
}
