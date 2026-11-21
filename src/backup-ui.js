// ── Backup: the controls, in Settings ────────────────────────────────────────
// Making and restoring a backup is a setting-like chore, so its buttons sit in
// the Settings drawer. The Progress screen only says when the last one was.

import { downloadBackup, lastBackup, parseBackup, restoreBackup } from './backup.js';
import { activeDays } from './data/activity.js';

const fmtDate = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const backupStatus = () => {
  const last = lastBackup();
  return last ? `Last backup: ${fmtDate(last)}` : 'No backup yet';
};

// Time to make one: the last is more than two weeks old, or there never was one
// and there are a few days of work to lose by now.
export function backupDue() {
  const last = lastBackup();
  return last ? Date.now() - last > 14 * 86400_000 : activeDays() >= 3;
}

export function renderBackupSection(root) {
  if (!root) return;
  root.innerHTML = `
    <div class="settings-label">Backup</div>
    <div class="bk-status ${backupDue() ? 'bk-due' : ''}" id="bkStatus">${backupStatus()}</div>
    <div class="bk-explain">Your progress lives only in this browser. A backup is one file that puts everything back, on another device too.</div>
    <div class="pg-backup-actions">
      <button class="pg-backup-btn pg-backup-primary" id="bkDownload" type="button">⬇️ Download</button>
      <button class="pg-backup-btn" id="bkRestore" type="button">⬆️ Restore</button>
      <input type="file" id="bkFile" accept="application/json,.json" hidden>
    </div>
    <div class="pg-backup-note" id="bkNote" hidden></div>`;

  const note = (text, bad = false) => { const n = root.querySelector('#bkNote'); n.textContent = text; n.hidden = false; n.classList.toggle('pg-backup-bad', bad); };
  root.querySelector('#bkDownload').addEventListener('click', () => {
    const b = downloadBackup();
    const status = root.querySelector('#bkStatus');
    status.textContent = backupStatus();
    status.classList.remove('bk-due');
    note(`Saved ${b.keys} items. Keep the file somewhere safe (a cloud drive, a mail to yourself).`);
  });
  const file = root.querySelector('#bkFile');
  root.querySelector('#bkRestore').addEventListener('click', () => { file.value = ''; file.click(); });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    let b;
    try { b = parseBackup(await f.text()); }
    catch (e) {
      note(e.message === 'not-json' ? 'That file is not readable.' : 'That is not a backup of this app.', true);
      return;
    }
    const when = b.exported ? fmtDate(Date.parse(b.exported)) : '?';
    const ok = window.confirm(`Replace everything on this device with the backup of ${when} (${b.keys ?? Object.keys(b.data).length} items)? The progress that is here now will be lost.`);
    if (!ok) return;
    restoreBackup(b);
    note('Restored. Reloading…');
    setTimeout(() => window.location.reload(), 400);
  });
}
