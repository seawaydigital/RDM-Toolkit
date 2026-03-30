import { useState, useCallback } from 'react';
import { ALL_TOOLS } from '../data/toolRegistry';

const STORAGE_KEY = 'rdm_recent_tools';
const MAX_RECENT = 5;

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function idsToTools(ids) {
  return ids
    .map(id => ALL_TOOLS.find(t => t.id === id))
    .filter(Boolean);
}

export function useRecentTools() {
  const [recentIds, setRecentIds] = useState(readIds);

  const addRecentTool = useCallback((toolId) => {
    setRecentIds(prev => {
      const deduplicated = [toolId, ...prev.filter(id => id !== toolId)].slice(0, MAX_RECENT);
      writeIds(deduplicated);
      return deduplicated;
    });
  }, []);

  return {
    recentTools: idsToTools(recentIds),
    addRecentTool,
  };
}
