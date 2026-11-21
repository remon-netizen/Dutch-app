// ── Storage ──────────────────────────────────────────────────────────────────
// Everything the app keeps (progress, schedules, settings) lives in this browser's
// localStorage. The site shares its address (…github.io) with other apps, and a
// browser keeps ONE storage per address. So every key gets this app's own prefix:
// another app at the same address can never read or overwrite what is kept here,
// and a backup or a reset touches this app's keys only.

const PREFIX = 'dutch.';

export const store = {
  getItem: key => localStorage.getItem(PREFIX + key),
  setItem: (key, value) => localStorage.setItem(PREFIX + key, value),
  removeItem: key => localStorage.removeItem(PREFIX + key),
  // The app's own keys, without the prefix.
  keys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out;
  },
  // Removes the app's own keys and nothing else.
  clear() { store.keys().forEach(k => localStorage.removeItem(PREFIX + k)); },
};

export function loadJSON(key, fallback) {
  try { const v = JSON.parse(store.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
export const saveJSON = (key, value) => store.setItem(key, JSON.stringify(value));
