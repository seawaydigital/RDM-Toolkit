import { useEffect } from 'react';

/**
 * Modal accessibility primitives: focus trap, focus restoration,
 * Escape-to-close, and body scroll lock.
 *
 * @param {Object} opts
 * @param {boolean} opts.isOpen
 * @param {() => void} opts.onClose
 * @param {React.RefObject<HTMLElement>} opts.dialogRef - the dialog container; required for focus trap
 * @param {React.RefObject<HTMLElement>} [opts.initialFocusRef] - element to focus when modal opens;
 *   defaults to first focusable element inside dialogRef
 */
export function useModalAccessibility({ isOpen, onClose, dialogRef, initialFocusRef }) {
  // Capture the previously focused element on open; restore it on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  // Move focus into the modal when it opens.
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      const target = initialFocusRef?.current ?? findFirstFocusable(dialogRef.current);
      target?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [isOpen, dialogRef, initialFocusRef]);

  // Body scroll lock: save the previous overflow value and restore it on close.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Escape-to-close and Tab focus trap.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = getFocusables(dialogRef.current);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, dialogRef]);
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusables(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR));
}

function findFirstFocusable(root) {
  return getFocusables(root)[0] ?? null;
}
