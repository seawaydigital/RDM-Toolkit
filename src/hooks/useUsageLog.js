import { useState, useCallback, useEffect } from 'react';

// Opt-in local-only usage log. Never transmitted. Readable by the user via the
// Feedback modal (Copy session log) so testers can paste it back to us.
//
// Storage keys:
//   rdm_usage_log_consent  -> 'granted' | 'denied'  (absent = not yet asked)
//   rdm_usage_log_v1       -> JSON array of events, capped at MAX_ENTRIES
//
// Event shape: { t: ISO timestamp, type: string, ...payload }
// Known types: 'tool_open', 'tool_complete', 'tool_error', 'page_open', 'session_start'
//
// We deliberately do NOT log file names, file contents, input text, form values,
// or anything else that could leak the user's data. Only tool IDs, page hashes,
// error classes, and timestamps.

const CONSENT_KEY = 'rdm_usage_log_consent';
const LOG_KEY = 'rdm_usage_log_v1';
const MAX_ENTRIES = 500;

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

function readLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // storage full or unavailable — silently drop
  }
}

let sessionStarted = false;

export function useUsageLog() {
  const [consent, setConsent] = useState(readConsent);

  const isEnabled = consent === 'granted';

  const logEvent = useCallback((type, payload = {}) => {
    if (readConsent() !== 'granted') return;
    const entry = { t: new Date().toISOString(), type, ...payload };
    const current = readLog();
    writeLog([...current, entry]);
  }, []);

  // Fire a session_start once per page-load when consent is granted
  useEffect(() => {
    if (isEnabled && !sessionStarted) {
      sessionStarted = true;
      logEvent('session_start', {
        ua: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine,
      });
    }
  }, [isEnabled, logEvent]);

  const grantConsent = useCallback(() => {
    writeConsent('granted');
    setConsent('granted');
  }, []);

  const denyConsent = useCallback(() => {
    writeConsent('denied');
    setConsent('denied');
  }, []);

  const clearLog = useCallback(() => {
    try {
      localStorage.removeItem(LOG_KEY);
    } catch {
      // ignore
    }
  }, []);

  const exportLog = useCallback(() => {
    return readLog();
  }, []);

  return {
    consent,
    isEnabled,
    hasAnswered: consent === 'granted' || consent === 'denied',
    logEvent,
    grantConsent,
    denyConsent,
    clearLog,
    exportLog,
  };
}
