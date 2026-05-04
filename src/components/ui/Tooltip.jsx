import { useId, useState, useRef, useEffect } from 'react';

/**
 * A WCAG 2.2 SC 1.4.13-conformant tooltip wrapper.
 *
 * Satisfies all three SC 1.4.13 requirements:
 *   - Dismissible  : Escape key closes without moving cursor/focus
 *   - Hoverable    : 100 ms grace period lets cursor traverse the gap from
 *                    trigger onto tooltip content without it disappearing
 *   - Persistent   : stays open until dismissed, focus moves, or trigger
 *                    is no longer hovered
 *
 * Props:
 *   content   — string displayed inside the tooltip
 *   children  — element(s) that trigger the tooltip on hover / focus
 *   position  — 'top' | 'bottom' | 'left' | 'right'  (default: 'top')
 */
export default function Tooltip({ content, children, position = 'top' }) {
  const tooltipId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef(null);

  // Show immediately; cancel any pending close.
  function show() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsVisible(true);
  }

  // Schedule hide after a short grace period so the cursor can move from
  // the trigger onto the tooltip content without the bubble vanishing.
  function scheduleClose() {
    closeTimerRef.current = setTimeout(() => setIsVisible(false), 100);
  }

  // Cancel a pending close (called when cursor enters the tooltip bubble).
  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  // Clean up the timer if the component unmounts while visible.
  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // SC 1.4.13 Dismissible: Escape closes the tooltip without moving focus.
  useEffect(() => {
    if (!isVisible) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsVisible(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  return (
    <span
      className={`tooltip-wrapper tooltip-wrapper--${position}`}
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
      onFocus={show}
      onBlur={scheduleClose}
    >
      {/* aria-describedby on the trigger element points to the tooltip id */}
      <span aria-describedby={isVisible ? tooltipId : undefined}>
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={`tooltip-bubble tooltip-bubble--${position}${isVisible ? ' tooltip-bubble--visible' : ''}`}
        // SC 1.4.13 Hoverable: pointer-events enabled so cursor can enter the
        // bubble; cancelClose() keeps it open while the cursor is over it.
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        {content}
      </span>
    </span>
  );
}
