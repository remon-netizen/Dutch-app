// ── Backup: all progress as one file, and back ───────────────────────────────
// Everything the app keeps lives in this browser's localStorage, under the app's
// own prefix (store.js): course progress and schedules, unit steps, grammar
// results, activity, settings. A backup is one JSON file with all of it.
// Restoring replaces the app's data on this device with the file's and reloads,
// so a browser reset or a new phone costs nothing. Other apps at the same web
// address are not read and not touched.

import { store } from './store.js';

const LAST = 'lastBackup';
const FORMAT = 'dutch-app-backup';

export function backupData() {
  const data = {};
  for (const k of store.keys()) if (k !== LAST) data[k] = store.getItem(k);
  return { format: FORMAT, version: 1, exported: new Date().toISOString(), keys: Object.keys(data).length, data };
}

// Hands the browser a file to save; on a phone that is the share / save sheet.
export function downloadBackup() {
  const b = backupData();
  const blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `dutch-app-backup-${b.exported.slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  store.setItem(LAST, String(Date.now()));
  return b;
}

export const lastBackup = () => Number(store.getItem(LAST)) || 0;

// Throws 'not-json' or 'not-backup'; otherwise returns the parsed backup.
export function parseBackup(text) {
  let b;
  try { b = JSON.parse(text); } catch { throw new Error('not-json'); }
  if (!b || b.format !== FORMAT || !b.data || typeof b.data !== 'object') throw new Error('not-backup');
  return b;
}

// Replace the app's data on this device with the backup's.
export function restoreBackup(b) {
  store.clear();
  for (const [k, v] of Object.entries(b.data)) if (typeof v === 'string') store.setItem(k, v);
}
