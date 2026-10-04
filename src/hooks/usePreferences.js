import { useState, useCallback } from 'react';

// Per-viewer UI preferences — currently only the sidebar's browse mode
// ('type' = tools grouped by file type, 'task' = common tasks). Stored in this
// browser only and wiped by ClearLocalData along with everything else.
const STORAGE_KEY = 'rdm_prefs_v1';
const DEFAULTS = { browseMode: 'type' };

function readPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState(readPrefs);

  const setPref = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (private window, blocked site data) — keep it in memory
      }
      return next;
    });
  }, []);

  return [prefs, setPref];
}
