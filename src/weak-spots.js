// ── Weak spots: where they are, and the way to each ──────────────────────────
// Every course keeps count of what the learner gets wrong more often than right.
// Home adds the counts up; this is the list behind that number, one row per
// kind with what a tap does there.

import { escHtml, count } from './utils.js';
import { openSheet, closeSheet } from './sheet.js';
import { pathStats } from './data/path-progress.js';
import { weakPointIds } from './data/grammar-progress.js';
import { weakVerbKeys } from './data/verb-progress.js';
import { weakNouns } from './data/dehet-progress.js';

// { icon, title, count, sub, run }
export function weakSpots() {
  const n = fn => { try { return fn(); } catch { return 0; } };
  return [
    { icon: '📖', title: 'Grammar points', count: n(() => weakPointIds().length), sub: 'fewer than 70% right lately: read the rule again and practise', run: () => window.openGrammarScreen() },
    { icon: '🗺️', title: 'Words and sentences', count: n(() => pathStats().weak), sub: 'practise them now', run: () => window.startPathWeak() },
    { icon: '🔀', title: 'Irregular verb forms', count: n(() => weakVerbKeys().length), sub: 'practise them now', run: () => window.startVerbWeak() },
    { icon: '🏷️', title: 'De or het', count: n(() => weakNouns().length), sub: 'practise them now', run: () => window.startDeHetWeak() },
  ].filter(x => x.count > 0);
}

export const weakSpotCount = () => weakSpots().reduce((sum, x) => sum + x.count, 0);

export function openWeakSpots() {
  const spots = weakSpots();
  openSheet({
    title: '🎯 Weak spots',
    html: `
      <p class="ws-lead">What you got wrong more often than right.</p>
      ${spots.map((x, i) => `
        <button class="ws-row" type="button" data-i="${i}">
          <span class="ws-icon">${x.icon}</span>
          <span class="ws-text"><span class="ws-title">${escHtml(x.title)}</span><span class="ws-sub">${escHtml(x.sub)}</span></span>
          <span class="ws-count">${x.count}</span>
        </button>`).join('') || `<p class="ws-lead">Nothing weak right now.</p>`}`,
    onOpen(root) {
      root.querySelectorAll('.ws-row').forEach(b => b.addEventListener('click', () => { closeSheet(); spots[Number(b.dataset.i)].run(); }));
    },
  });
}
