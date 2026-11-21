// ── De or het: the trainer ───────────────────────────────────────────────────
// One noun, two buttons. Fifteen new nouns at a time, each on the shared review
// schedule afterwards (data/dehet-progress.js). Under the verdict: the noun with
// its article, and the rule it follows when there is one. The everyday nouns
// come from data/nouns.js; the nouns of the course join as their units are done.

import { escHtml, shuffle, count } from '../utils.js';
import { showScreen } from '../router.js';
import { openSheet } from '../sheet.js';
import { NOUN_SETS, RULES, tipFor } from '../data/nouns.js';
import { allNouns, nounKey, nounEntry, recordNoun, isNewNoun, isLearnedNoun, dueNouns, weakNouns, dehetStats } from '../data/dehet-progress.js';
import { runSession } from './course-engine.js';
import { sayBtn } from './drill-core.js';

export const COURSE = { icon: '🏷️', name: 'De or het?' };
const ACCENT = { main: '#1d4ed8', dark: '#1e3a8a', soft: '#eff6ff', border: '#bfdbfe' };
const BATCH = 15;

const getScreen = () => document.getElementById('dehetScreen');

export function openDeHetScreen() {
  showScreen('dehetScreen');
  showMenu();
}

// The sets as the menu shows them: the everyday ones, then the course's own nouns.
function sets() {
  const course = allNouns().filter(n => n.set === 'course');
  return [...NOUN_SETS, ...(course.length ? [{ id: 'course', title: 'From the course', icon: '🗺️', nouns: course }] : [])];
}

// ── Menu ─────────────────────────────────────────────────────────────────────

function showMenu() {
  const s = getScreen();
  const st = dehetStats();
  const due = dueNouns().length, weak = weakNouns().length;
  const fresh = allNouns().filter(isNewNoun).length;

  const setRow = set => {
    const done = set.nouns.filter(isLearnedNoun).length, left = set.nouns.filter(isNewNoun).length;
    const pct = Math.round(done / set.nouns.length * 100);
    return `
    <button class="dh-set" type="button" data-set="${set.id}">
      <span class="dh-set-icon">${set.icon}</span>
      <span class="dh-set-text">
        <span class="dh-set-title">${escHtml(set.title)}</span>
        <span class="dh-set-sub">${done} / ${set.nouns.length} learned${left ? ` · ${left} new` : ''}</span>
        <span class="vb-group-bar"><div style="width:${pct}%"></div></span>
      </span>
      <span class="dh-set-go">${left ? '▶' : '🔄'}</span>
    </button>`;
  };

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" id="dhBack" type="button" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">${COURSE.icon} ${COURSE.name}</div>
        <div class="lesson-subtitle">The article of the nouns you use every day</div>
      </div>
    </div>

    <div class="pt-stats-bar">
      <span class="pt-stat">🏷️ ${st.learned} / ${st.total} learned</span>
      <span class="pt-stat ${due ? 'pt-stat-due' : ''}">🔄 ${due} due</span>
      <span class="pt-stat">🎯 ${weak} weak</span>
    </div>

    ${due ? `<button class="pt-continue" id="dhDue" type="button">
      <span class="pt-continue-icon">🔄</span>
      <span><span class="pt-continue-title">Review: ${count(due, 'noun')} due</span><br><span class="pt-continue-sub">The ones you learned before, just before you would forget them</span></span>
    </button>` : ''}
    ${fresh ? `<button class="pt-continue ${due ? 'dh-second' : ''}" id="dhNew" type="button">
      <span class="pt-continue-icon">▶</span>
      <span><span class="pt-continue-title">Learn ${Math.min(BATCH, fresh)} new nouns</span><br><span class="pt-continue-sub">The next ones in order, from the sets below</span></span>
    </button>` : ''}
    ${weak ? `<button class="vc-browse-btn" id="dhWeak" type="button">🎯 Practise the ${count(weak, 'noun')} you get wrong most</button>` : ''}
    <button class="vc-browse-btn" id="dhRules" type="button">💡 Rules that help</button>

    <div class="pt-section-label">Sets</div>
    <div class="dh-sets">${sets().map(setRow).join('')}</div>`;

  s.querySelector('#dhBack').addEventListener('click', () => showScreen('homeScreen'));
  s.querySelector('#dhDue')?.addEventListener('click', startDeHetReview);
  s.querySelector('#dhNew')?.addEventListener('click', () => startNew(allNouns()));
  s.querySelector('#dhWeak')?.addEventListener('click', startWeak);
  s.querySelector('#dhRules').addEventListener('click', openRules);
  s.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
    const set = sets().find(x => x.id === b.dataset.set);
    if (set.nouns.some(isNewNoun)) startNew(set.nouns, set); else startPractise(set);
  }));
  s.scrollTo({ top: 0 });
}

function openRules() {
  const list = rows => `<ul class="dh-rules">${rows.map(([rule, ex]) => `<li><b>${escHtml(rule)}</b><br><span>${escHtml(ex)}</span></li>`).join('')}</ul>`;
  openSheet({
    title: '💡 De or het: rules that help',
    html: `
      <p class="vb-note">Two nouns out of three are de-words. No rule covers every noun, which is why a noun is best learned together with its article. These rules have hardly any exceptions:</p>
      <h4 class="dh-rules-head">het</h4>${list(RULES.het)}
      <h4 class="dh-rules-head">de</h4>${list(RULES.de)}
      <p class="vb-note">A compound takes the article of its last part: het huis, so het stadhuis; de kamer, so de slaapkamer.</p>`,
  });
}

// ── Cards ────────────────────────────────────────────────────────────────────

function nounCard(n, { practice = false } = {}) {
  const shown = `${n.art} ${n.nl}`;
  const tip = tipFor(n);
  return {
    key: nounKey(n), course: COURSE, intro: false,
    promptHtml: `
      <div class="pt-q-card">
        <div class="pt-q-label">De or het?</div>
        <div class="pt-q-main">${escHtml(n.nl)}</div>
        <div class="pt-q-hint">${escHtml(n.en)}</div>
      </div>`,
    input: { type: 'choice', layout: 'pair', options: [{ label: 'de', correct: n.art === 'de', key: 'd' }, { label: 'het', correct: n.art === 'het', key: 'h' }] },
    check: () => null,
    record: res => (practice ? null : recordNoun(n, res.quality)),
    override: null,
    correctText: shown,
    detailHtml: `
      <div class="pt-detail-full">${escHtml(shown)} ${sayBtn(shown)}${n.pl ? ` <span class="pt-detail-forms">plural: de ${escHtml(n.pl)}</span>` : ''}</div>
      <div class="pt-detail-en">${escHtml(n.en)}</div>
      ${tip ? `<div class="pt-detail-note">💡 ${escHtml(tip)}</div>` : ''}`,
    missed: { left: n.nl, right: shown, extra: n.en, say: shown },
  };
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function run(title, cards, { again = () => null, warmUp = 0 } = {}) {
  showScreen('dehetScreen');
  if (!cards.length) { showMenu(); return; }
  runSession({ screen: getScreen(), icon: COURSE.icon, title, accent: ACCENT, cards, onExit: showMenu, again, warmUp, warmUpSource: warmUp ? () => shuffle(dehetDueCards()) : null });
}

// The next new nouns of a list, in its order.
function startNew(nouns, set = null) {
  const batch = nouns.filter(isNewNoun).slice(0, BATCH);
  if (!batch.length) { showMenu(); return; }
  run(set ? set.title : 'New nouns', batch.map(n => nounCard(n)), {
    warmUp: 5,
    again: () => {
      const left = nouns.filter(isNewNoun).length;
      return left ? { label: `▶ ${Math.min(BATCH, left)} more`, run: () => startNew(nouns, set) } : null;
    },
  });
}

// A set again, without touching the schedule.
function startPractise(set) {
  run(set.title, shuffle(set.nouns).slice(0, 20).map(n => nounCard(n, { practice: true })), { again: () => ({ label: '🔄 Another round', run: () => startPractise(set) }) });
}

function startWeak() {
  run('Weak nouns', shuffle(weakNouns()).slice(0, 25).map(n => nounCard(n)));
}

// ── Review ───────────────────────────────────────────────────────────────────

export const dehetDueCards = () => dueNouns().map(n => nounCard(n));

export function startDeHetReview() {
  showScreen('reviewScreen');
  const cards = shuffle(dehetDueCards()).slice(0, 40);
  if (!cards.length) { window.openReviewScreen(); return; }
  runSession({
    screen: document.getElementById('reviewScreen'), icon: COURSE.icon, title: COURSE.name, accent: ACCENT, cards,
    onExit: () => window.openReviewScreen(),
    again: () => { const left = dueNouns().length; return left ? { label: `🔄 Keep going: ${left} left`, run: startDeHetReview } : null; },
  });
}

export { startWeak as startDeHetWeak };
