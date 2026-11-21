// ── The app: Home, Settings, and what the other modules need from each other ──
import { state } from './state.js';
import { store } from './store.js';
import { escHtml, count } from './utils.js';
import { loadVoices, changeVoice, testVoice, speakText } from './voice.js';
import { showScreen, sheetOpened, sheetClosed } from './router.js';
import { openPathScreen, startPathReview, startPathWeak } from './grammar/path-ui.js';
import { openGrammarScreen, startGrammarPractice } from './grammar/grammar-ui.js';
import { openVerbsScreen, startVerbReview, startVerbWeak } from './grammar/verbs-ui.js';
import { openDeHetScreen, startDeHetReview, startDeHetWeak } from './grammar/dehet-ui.js';
import { openProgressScreen } from './progress-ui.js';
import { weakSpotCount, openWeakSpots } from './weak-spots.js';
import { openReviewScreen, startReviewAll, getDueTotal } from './review.js';
import { nextOpenUnit, pathStats, unitStarted } from './data/path-progress.js';
import { unitName } from './data/path/index.js';
import { renderBackupSection } from './backup-ui.js';

// ── Speech speed ──────────────────────────────────────────────────────────────
function setSpeechRate(rate) {
  state.speechRate = rate;
  store.setItem('speechRate', rate);
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.rate) === rate);
  });
}

// ── Settings drawer ───────────────────────────────────────────────────────────
function setSettingsDrawer(open) {
  document.getElementById('settingsDrawer').classList.toggle('open', open);
  document.getElementById('drawerOverlay').classList.toggle('open', open);
  document.body.classList.toggle('drawer-open', open);
  // The backup section shows when the last one was: fill it in as the drawer opens.
  if (open) renderBackupSection(document.getElementById('backupSection'));
  // The back gesture closes an open drawer instead of leaving the screen behind it.
  if (open) sheetOpened(closeSettingsDrawer); else sheetClosed(closeSettingsDrawer);
}
function closeSettingsDrawer() { setSettingsDrawer(false); }
function toggleSettingsDrawer() {
  setSettingsDrawer(!document.getElementById('settingsDrawer').classList.contains('open'));
}

// ── The gear in every screen header ───────────────────────────────────────────
// Inside a screen the app's own header is hidden (the screen has one of its own,
// and on a phone the room is better spent on the card), so the way to Settings
// moves into the screen header. Screens write their header out again with every
// view and every card; rather than have each of them add the button, it is put
// in whenever a header appears without one.
function dressHeaders() {
  document.querySelectorAll('.screen .lesson-header').forEach(h => {
    if (h.querySelector('.lesson-settings')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lesson-settings';
    b.textContent = '⚙️';
    b.title = 'Settings';
    b.setAttribute('aria-label', 'Settings');
    h.appendChild(b);
  });
}
new MutationObserver(dressHeaders).observe(document.querySelector('.app'), { childList: true, subtree: true });
document.addEventListener('click', e => { if (e.target.closest('.lesson-settings')) toggleSettingsDrawer(); });

// ── Review count badge + Today card ──────────────────────────────────────────
// The badge shows what is DUE, not how much has ever been learned; that is the
// number a learner acts on.
function updateHome() {
  const due = getDueTotal();
  const badge = document.getElementById('reviewBtnCount');
  if (badge) {
    badge.textContent = due > 0 ? due : '';
    badge.style.display = due > 0 ? '' : 'none';
  }
  renderTodayCard(due);
}

// One card at the top of Home that answers "what should I do now?".
function renderTodayCard(due) {
  const card = document.getElementById('todayCard');
  if (!card) return;
  const weak = weakSpotCount();
  const next = nextOpenUnit();
  const anyProgress = pathStats().seen > 0 || due > 0;

  const rows = [];
  if (due > 0) rows.push({ icon: '🔄', title: 'Review', sub: `${due} due, in one round`, onclick: 'openReviewScreen()', hot: true });
  if (weak > 0) rows.push({ icon: '🎯', title: 'Weak spots', sub: `${count(weak, 'thing')} you got wrong more often than right`, onclick: 'openWeakSpots()' });
  if (next) {
    rows.push({ icon: next.icon, title: unitStarted(next.id) ? 'Continue' : !anyProgress ? 'Start here' : 'Next unit',
      sub: `${unitName(next)} · ${next.grammar}`, onclick: `openPathScreen('${next.id}')`, hot: !anyProgress });
  }
  if (!rows.length) { card.style.display = 'none'; return; }

  card.style.display = '';
  card.innerHTML = `
    <div class="today-title">📅 Today</div>
    ${rows.map(r => `
      <button class="today-row ${r.hot ? 'today-row-hot' : ''}" onclick="${r.onclick}">
        <span class="today-icon">${r.icon}</span>
        <span class="today-text"><span class="today-row-title">${escHtml(r.title)}</span><span class="today-row-sub">${escHtml(r.sub)}</span></span>
        <span class="today-arrow">→</span>
      </button>`).join('')}`;
}
document.addEventListener('screenShown', e => { if (e.detail.id === 'homeScreen') updateHome(); });

// ── Init ──────────────────────────────────────────────────────────────────────
loadVoices();
setSpeechRate(state.speechRate);
updateHome();

// Register the service worker, for use without a connection and from the home screen.
// Skipped on localhost: the cache-first strategy would keep serving stale files
// during development. A worker left over from an earlier visit is torn down too,
// and with it this app's own caches (and only those: other apps share the address).
const isLocalhost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
if ('serviceWorker' in navigator) {
  if (isLocalhost) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.filter(r => r.scope.startsWith(new URL('./', location.href).href)).map(r => r.unregister())))
      .then(() => caches?.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dutch-app-')).map(k => caches.delete(k)))))
      .catch(() => {});
  } else {
    // A new worker installs and claims the page, but the page is already rendered
    // from the old cache and nothing reloads it, so the app would keep showing an
    // old build. On Home, where nothing is in progress, reload straight away;
    // elsewhere (a round lives in memory) show a toast and let the learner choose.
    // Re-check on foreground: an app resumed from memory never navigates and so
    // never checks on its own.
    const hadController = !!navigator.serviceWorker.controller;
    let handled = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || handled) return; // first install: the page is already current
      handled = true;
      const onHome = document.getElementById('homeScreen')?.classList.contains('active');
      if (onHome) { location.reload(); return; }
      const toast = document.getElementById('updateToast');
      if (toast) toast.style.display = '';
    });
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  }
}

// ── What the HTML and the other modules call by name ──────────────────────────
Object.assign(window, {
  toggleSettingsDrawer, closeSettingsDrawer, showScreen, setSpeechRate, changeVoice, testVoice, speakText,
  openPathScreen, startPathReview, startPathWeak,
  openGrammarScreen, startGrammarPractice,
  openVerbsScreen, startVerbReview, startVerbWeak,
  openDeHetScreen, startDeHetReview, startDeHetWeak,
  openReviewScreen, startReviewAll, openProgressScreen, openWeakSpots,
});
