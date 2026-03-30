import { useId } from 'react';

/**
 * A CSS-only hover tooltip wrapper.
 *
 * Props:
 *   content   — string displayed inside the tooltip
 *   children  — element(s) that trigger the tooltip on hover
 *   position  — 'top' | 'bottom' | 'left' | 'right'  (default: 'top')
 */
export default function Tooltip({ content, children, position = 'top' }) {
  const tooltipId = useId();

  return (
    <span
      className={`tooltip-wrapper tooltip-wrapper--${position}`}
      aria-describedby={tooltipId}
    >
      {children}
      <span
        id={tooltipId}
        role="tooltip"
        className={`tooltip-bubble tooltip-bubble--${position}`}
      >
        {content}
      </span>
    </span>
  );
}
