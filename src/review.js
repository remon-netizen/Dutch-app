// ── Review: one queue for everything that is due ──────────────────────────────
// Every course (the course path, the irregular verbs, de/het) is scheduled the
// same way and hands over its due items as course-engine cards, so they can be
// shuffled into a single round. The hub shows that one button first, then a row
// per course for reviewing a single subject.

import { showScreen } from './router.js';
import { loadJSON, saveJSON, store } from './store.js';
import { shuffle } from './utils.js';
import { pathStats } from './data/path-progress.js';
import { verbStats } from './data/verb-progress.js';
import { dehetStats } from './data/dehet-progress.js';
import { pathDueCards, COURSE as PATH } from './grammar/path-ui.js';
import { verbDueCards, COURSE as VERBS } from './grammar/verbs-ui.js';
import { dehetDueCards, COURSE as DEHET } from './grammar/dehet-ui.js';
import { runSession, registerDueSource } from './grammar/course-engine.js';

function getScreen() { return document.getElementById('reviewScreen'); }

// ── The courses ──────────────────────────────────────────────────────────────
// A new course is one entry here: hub row, due totals, Today card, Progress
// screen and the mixed round all follow.

const COURSES = [
  { id: 'path', ...PATH, unit: 'words and sentences', fresh: 'Not started: open unit A2 · 1',
    stats: pathStats, dueCards: pathDueCards, review: 'startPathReview()', open: 'openPathScreen()' },
  { id: 'verbs', ...VERBS, unit: 'verb forms', fresh: 'Not started: learn the first five verbs',
    stats: verbStats, dueCards: verbDueCards, review: 'startVerbReview()', open: 'openVerbsScreen()' },
  { id: 'dehet', ...DEHET, unit: 'nouns', fresh: 'Not started: learn the first 15 nouns',
    stats: dehetStats, dueCards: dehetDueCards, review: 'startDeHetReview()', open: 'openDeHetScreen()' },
];

export const getCourses = () => COURSES;

// Everything due across the courses: the home badge and the Today card.
export const getDueTotal = () => COURSES.reduce((n, c) => n + c.stats().due, 0);

// Sessions that teach something new start with a few of these (course-engine warm-up).
registerDueSource({ cards: () => COURSES.flatMap(c => c.dueCards()), count: getDueTotal });

// ── Catch-up ─────────────────────────────────────────────────────────────────
// After a break the queue can be hundreds deep. Catch-up spreads it: the learner
// takes a daily share (the queue over seven days) and the rest simply waits;
// nothing is rescheduled. { date, share, done } under 'reviewCatchUp'.
const CATCH_KEY = 'reviewCatchUp';
const CATCH_FROM = 100, CATCH_DAYS = 7;
const today = () => new Date().toISOString().slice(0, 10);
function catchUp() { const c = loadJSON(CATCH_KEY, null); return c && c.date === today() ? c : null; }
const saveCatchUp = c => saveJSON(CATCH_KEY, c);
function startCatchUp() { saveCatchUp({ date: today(), share: Math.ceil(getDueTotal() / CATCH_DAYS), done: 0 }); }
function stopCatchUp() { store.removeItem(CATCH_KEY); }
// How many the mixed round may take right now: the daily share left, or the usual cap.
function roundSize() {
  const c = catchUp();
  return c ? Math.max(0, Math.min(REVIEW_ROUND, c.share - c.done)) : REVIEW_ROUND;
}
function countDone(n) { const c = catchUp(); if (c) saveCatchUp({ ...c, done: c.done + n }); }

// ── Sessions ─────────────────────────────────────────────────────────────────

const REVIEW_ROUND = 30;

export function startReviewAll() {
  showScreen('reviewScreen');
  const cards = shuffle(COURSES.flatMap(c => c.dueCards())).slice(0, roundSize());
  if (!cards.length) { openReviewScreen(); return; }
  runSession({
    screen: getScreen(), icon: '🔄', title: 'Review', mixed: true,
    cards,
    onExit: openReviewScreen,
    again: () => {
      countDone(cards.length);
      const left = getDueTotal(), c = catchUp();
      if (c && c.done >= c.share) return left ? { label: `✓ Done for today · ${left} wait for tomorrow`, run: openReviewScreen } : null;
      return left ? { label: `🔄 Keep going: ${left} left`, run: startReviewAll } : null;
    },
  });
}
window.startCatchUp = () => { startCatchUp(); openReviewScreen(); };
window.stopCatchUp = () => { stopCatchUp(); openReviewScreen(); };

// ── The hub ──────────────────────────────────────────────────────────────────

// The big review button, or the catch-up offer / state when the queue is deep.
function catchUpHtml(due) {
  const c = catchUp();
  if (!due) return `<button class="rv-all-btn" disabled><span class="rv-all-title">🔄 Nothing due right now</span></button>`;
  if (c) {
    const left = Math.max(0, c.share - c.done);
    return `<button class="rv-all-btn" ${left ? 'onclick="startReviewAll()"' : 'disabled'}>
        <span class="rv-all-title">${left ? `🔄 ${left} of today's share (${c.share}) to go` : '✓ Done for today'}</span>
        <span class="rv-all-sub">Catching up: ${due} due, spread over ${CATCH_DAYS} days. The rest just waits.</span>
      </button>
      <button class="rv-catch-link" onclick="stopCatchUp()">Show everything anyway</button>`;
  }
  const offer = due >= CATCH_FROM ? `<button class="rv-catch-btn" onclick="startCatchUp()">🗓️ A lot at once? Spread ${due} over ${CATCH_DAYS} days (${Math.ceil(due / CATCH_DAYS)} a day)</button>` : '';
  return `<button class="rv-all-btn" onclick="startReviewAll()">
      <span class="rv-all-title">🔄 Review everything: ${due} due</span>
      <span class="rv-all-sub">Everything that is due, mixed, in one round</span>
    </button>${offer}`;
}

export function openReviewScreen() {
  showScreen('reviewScreen');
  const due = getDueTotal();

  // A row per course the learner has started; a course that was never opened has
  // nothing to review yet.
  const courseRow = c => {
    const st = c.stats();
    return `
    <button class="rv-row" onclick="${st.due ? c.review : c.open}">
      <span class="rv-row-icon">${c.icon}</span>
      <span class="rv-row-text">
        <span class="rv-row-title">${c.name}</span>
        <span class="rv-row-sub">${st.due} due · ${st.seen} seen, ${st.learned} learned of ${st.total}</span>
      </span>
      <span class="rv-row-count ${st.due ? 'rv-row-due' : ''}">${st.due ? st.due : st.learned}</span>
    </button>`;
  };
  const started = COURSES.filter(c => c.stats().seen > 0);

  getScreen().innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" onclick="showScreen('homeScreen')" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">🔄 Review</div>
        <div class="lesson-subtitle">What is due today</div>
      </div>
    </div>
    ${catchUpHtml(due)}
    <div class="rv-hub">
      ${started.map(courseRow).join('')}
      ${started.length ? '' : `
        <div class="rv-empty-note">What you have learned comes back here, each time just before you would forget it. As soon as you have learned something, it shows up here.</div>
        <div class="rv-empty">
          <button class="rv-empty-btn" onclick="openPathScreen()">🗺️ Start the course path</button>
        </div>`}
    </div>`;
}
