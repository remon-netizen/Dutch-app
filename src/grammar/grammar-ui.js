// ── Grammar: every rule of the course, and where the learner slips ───────────
// The course teaches one grammar point per unit. This screen is the same
// material seen from the grammar side: all the points in one list, each with its
// rule, its explanation and how the exercises have gone; the points that go
// wrong most; and practice, of one point or mixed.
// The exercises themselves are the units' (path-ui.js makes the cards); what is
// kept about them is in data/grammar-progress.js.

import { escHtml, shuffle, count } from '../utils.js';
import { showScreen } from '../router.js';
import { LEVELS, UNITS, unitsOf, getUnit, unitIndex, unitName } from '../data/path/index.js';
import { unitState } from '../data/path-progress.js';
import { grammarOf, weakPointIds, grammarTotals, isWeakPoint } from '../data/grammar-progress.js';
import { runSession } from './course-engine.js';
import { wireSpeakButtons } from './drill-core.js';
import { exerciseCard, renderExplain, inline } from './path-ui.js';

export const COURSE = { icon: '📖', name: 'Grammar' };
const ACCENT = { main: '#be123c', dark: '#881337', soft: '#fff1f2', border: '#fecdd3' };
const ROUND = 20;
let query = '';

const getScreen = () => document.getElementById('grammarScreen');

export function openGrammarScreen(unitId) {
  showScreen('grammarScreen');
  const u = unitId && getUnit(unitId);
  if (u) showPoint(u); else showMenu();
}

// ── What can be practised ────────────────────────────────────────────────────

// A point is "open" once the learner has met its exercises: in its unit, or here.
const isOpen = u => !!unitState(u.id).exercises || grammarOf(u.id).a > 0;
const openUnits = () => UNITS.filter(isOpen);

// The exercises of one point, the ones last answered wrong first.
function pointOrder(unit, { onlyMissed = false } = {}) {
  const miss = grammarOf(unit.id).miss.filter(i => unit.exercises[i]);
  if (onlyMissed) return miss;
  return [...miss, ...unit.exercises.map((_, i) => i).filter(i => !miss.includes(i))];
}

// A mixed round over everything that is open: what was missed comes first, then
// the weak points get twice the share of the rest.
function mixedRound() {
  const missed = [], rest = [];
  for (const u of openUnits()) {
    const miss = new Set(grammarOf(u.id).miss);
    u.exercises.forEach((_, i) => {
      if (miss.has(i)) missed.push([u, i]);
      else { rest.push([u, i]); if (isWeakPoint(u.id)) rest.push([u, i]); }
    });
  }
  const seen = new Set(), out = [];
  for (const [u, i] of [...shuffle(missed), ...shuffle(rest)]) {
    const k = `${u.id}:${i}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push([u, i]);
    if (out.length === ROUND) break;
  }
  return out;
}

// ── Menu ─────────────────────────────────────────────────────────────────────

const pctClass = pct => (pct >= 85 ? 'gr-good' : pct >= 70 ? 'gr-ok' : 'gr-bad');
function chip(unit) {
  const g = grammarOf(unit.id);
  if (g.pct == null) return `<span class="gr-chip gr-new">${isOpen(unit) ? 'not practised' : ''}</span>`;
  return `<span class="gr-chip ${pctClass(g.pct)}">${g.pct}%</span>`;
}

function showMenu() {
  const s = getScreen();
  const totals = grammarTotals();
  const weak = weakPointIds().map(getUnit).filter(Boolean).sort((a, b) => grammarOf(a.id).pct - grammarOf(b.id).pct);
  const available = openUnits().reduce((n, u) => n + u.exercises.length, 0);

  const row = u => `
    <button class="gr-row" type="button" data-unit="${u.id}" data-text="${escHtml((u.grammar + ' ' + u.summary + ' ' + u.title).toLowerCase())}">
      <span class="gr-row-icon">${u.icon}</span>
      <span class="gr-row-text">
        <span class="gr-row-title">${escHtml(u.grammar)}</span>
        <span class="gr-row-sub">${escHtml(u.summary || '')}</span>
      </span>
      ${chip(u)}
    </button>`;

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" id="grBack" type="button" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">${COURSE.icon} ${COURSE.name}</div>
        <div class="lesson-subtitle">Every rule of the course, and how each one is going</div>
      </div>
    </div>

    <div class="pt-stats-bar">
      <span class="pt-stat">📖 ${totals.points} / ${UNITS.length} points practised</span>
      <span class="pt-stat">✍️ ${totals.answers ? Math.round(totals.correct / totals.answers * 100) + '% right' : 'no answers yet'}</span>
      <span class="pt-stat ${totals.weak ? 'pt-stat-due' : ''}">🎯 ${totals.weak} to work on</span>
    </div>

    <button class="pt-continue gr-practise" id="grPractise" type="button" ${available ? '' : 'disabled'}>
      <span class="pt-continue-icon">✍️</span>
      <span><span class="pt-continue-title">${available ? `Practise grammar · ${Math.min(ROUND, available)} exercises` : 'Practise grammar'}</span><br>
      <span class="pt-continue-sub">${available ? 'Mixed, from the points you have done. What you got wrong comes first.' : 'Opens once you have done the exercises of a unit. Any single point below can be practised right away.'}</span></span>
    </button>

    ${weak.length ? `
    <div class="pt-section-label">Where you slip</div>
    <div class="gr-list">${weak.map(row).join('')}</div>` : ''}

    <div class="gr-search-wrap"><input type="search" class="gr-search" id="grSearch" placeholder="Find a rule: er, passive, omdat, de/het…" value="${escHtml(query)}" autocomplete="off" autocapitalize="off" spellcheck="false" /></div>

    ${LEVELS.map(l => {
      const us = unitsOf(l.id);
      return us.length ? `<div class="gr-level" data-level="${l.id}">
        <div class="pt-section-label">${l.id} · ${escHtml(l.name)}</div>
        <div class="gr-list">${us.map(row).join('')}</div>
      </div>` : '';
    }).join('')}
    <div class="pt-empty" id="grNone" hidden>No rule matches that.</div>`;

  const applyFilter = () => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let any = false;
    s.querySelectorAll('.gr-level').forEach(level => {
      let shown = 0;
      level.querySelectorAll('.gr-row').forEach(r => { const hit = words.every(w => r.dataset.text.includes(w)); r.hidden = !hit; if (hit) shown++; });
      level.hidden = !shown;
      if (shown) any = true;
    });
    s.querySelector('#grNone').hidden = any;
  };
  s.querySelector('#grBack').addEventListener('click', () => showScreen('homeScreen'));
  s.querySelector('#grPractise').addEventListener('click', startGrammarPractice);
  s.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => showPoint(getUnit(b.dataset.unit))));
  s.querySelector('#grSearch').addEventListener('input', e => { query = e.target.value; applyFilter(); });
  applyFilter();
  s.scrollTo({ top: 0 });
}

// ── One grammar point ────────────────────────────────────────────────────────

function showPoint(unit) {
  const s = getScreen();
  const g = grammarOf(unit.id);
  const missed = pointOrder(unit, { onlyMissed: true }).length;
  const standing = g.pct == null ? 'Not practised yet.'
    : `${g.pct}% right over your last ${count(g.n, 'answer')}${missed ? ` · ${count(missed, 'exercise')} to get right` : ''}`;

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" id="grPointBack" type="button" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">${unit.icon} ${escHtml(unit.grammar)}</div>
        <div class="lesson-subtitle">${escHtml(unitName(unit))}</div>
      </div>
    </div>

    <div class="pt-rule">📌 ${inline(unit.summary || '')}</div>
    <div class="gr-standing ${g.pct == null ? '' : pctClass(g.pct)}">${escHtml(standing)}</div>

    <div class="pt-actions gr-actions">
      <button class="pt-action pt-action-next" id="grAll" type="button">
        <span class="pt-action-icon">✍️</span>
        <span class="pt-action-title">Practise this point</span>
        <span class="pt-action-sub">${unit.exercises.length} exercises${missed ? ', the ones you got wrong first' : ''}</span>
      </button>
      ${missed ? `<button class="pt-action" id="grMissed" type="button">
        <span class="pt-action-icon">🎯</span>
        <span class="pt-action-title">Only what went wrong</span>
        <span class="pt-action-sub">${count(missed, 'exercise')}</span>
      </button>` : ''}
      <button class="pt-action" id="grUnit" type="button">
        <span class="pt-action-icon">🗺️</span>
        <span class="pt-action-title">Open the unit</span>
        <span class="pt-action-sub">${unit.level} · ${unitIndex(unit)}: its words and sentences</span>
      </button>
    </div>

    <div class="pt-card">
      <div class="pt-card-title">📖 Explanation</div>
      <div class="pt-explain">${renderExplain(unit.explain)}</div>
    </div>`;

  wireSpeakButtons(s);
  s.querySelector('#grPointBack').addEventListener('click', showMenu);
  s.querySelector('#grAll').addEventListener('click', () => startPoint(unit));
  s.querySelector('#grMissed')?.addEventListener('click', () => startPoint(unit, { onlyMissed: true }));
  s.querySelector('#grUnit').addEventListener('click', () => window.openPathScreen(unit.id));
  s.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function startPoint(unit, { onlyMissed = false } = {}) {
  const order = pointOrder(unit, { onlyMissed });
  if (!order.length) { showPoint(unit); return; }
  runSession({
    screen: getScreen(), icon: unit.icon, title: unit.grammar, accent: ACCENT,
    cards: order.map(i => exerciseCard(unit, i, { course: COURSE })),
    onExit: () => showPoint(unit),
    scoreSubtitle: () => unitName(unit),
    again: () => {
      const left = pointOrder(unit, { onlyMissed: true }).length;
      return left ? { label: `🎯 Again: the ${left} you got wrong`, run: () => startPoint(unit, { onlyMissed: true }) } : null;
    },
  });
}

export function startGrammarPractice() {
  showScreen('grammarScreen');
  const round = mixedRound();
  if (!round.length) { showMenu(); return; }
  runSession({
    screen: getScreen(), icon: '✍️', title: 'Grammar practice', accent: ACCENT, mixed: true,
    cards: round.map(([u, i]) => exerciseCard(u, i, { course: { icon: u.icon, name: u.grammar } })),
    onExit: showMenu,
    again: () => ({ label: '🔄 Another round', run: startGrammarPractice }),
  });
}
