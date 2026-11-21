// ── Course path: the course from A2 to B2 ────────────────────────────────────
// Menu: a level, its units, where the learner is. Unit page: the rule in short,
// the grammar explained, the words, the sentences, and three steps run on the
// course engine: learn the words (shown, recognised, typed with de/het),
// practise the sentences (copied with their note, then typed from the English),
// and the grammar exercises (choose, fill in, word order, rewrite, correct).
// Words and sentences join the shared review queue (data/path-progress.js); how
// the exercises go is kept per grammar point (data/grammar-progress.js).

import { escHtml, shuffle, count } from '../utils.js';
import { showScreen } from '../router.js';
import { openSheet } from '../sheet.js';
import { loadJSON, saveJSON } from '../store.js';
import { LEVELS, UNITS, unitsOf, getUnit, unitIndex, nextUnit, unitName } from '../data/path/index.js';
import { unitItems, entryOf, recordItem, regradeItem, dueItems, weakItems, learnedDueItems, learnedSoonItems, pathStats, unitProgress, unitState, markUnitStep, unitDone, unitStarted, unitsDone, nextOpenUnit, STEPS, getResume, saveResume, clearResume } from '../data/path-progress.js';
import { recordExercise, regradeExercise, grammarOf } from '../data/grammar-progress.js';
import { runSession } from './course-engine.js';
import { clean, compare, strictVerdict, right, wrong, sayBtn, wireSpeakButtons } from './drill-core.js';

export const COURSE = { icon: '🗺️', name: 'Course path' };
const ACCENT = { main: '#0d9488', dark: '#115e59', soft: '#f0fdfa', border: '#99f6e4' };
const PREFS_KEY = 'pathPrefs';
let pt = { level: 'A2' };

function loadPrefs() { const p = loadJSON(PREFS_KEY, null); if (p?.level && LEVELS.some(l => l.id === p.level)) pt.level = p.level; }
function savePrefs() { saveJSON(PREFS_KEY, { level: pt.level }); }
function getScreen() { return document.getElementById('pathScreen'); }

const POS_NAME = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', num: 'number', expr: 'expression' };

// What there is to know about a word besides its meaning: the plural of a noun,
// the past and the perfect of a verb.
export function wordForms(w) {
  const parts = [];
  if (w.pos === 'n' && w.pl) parts.push(`plural: ${w.pl}`);
  if (w.pos === 'v') parts.push(`${w.past} · ${w.perf}`);
  if (w.tag) parts.push(w.tag);
  return parts.join(' · ');
}
const wordTag = w => [POS_NAME[w.pos] || w.pos, wordForms(w)].filter(Boolean).join(' · ');

// ── Public entry ─────────────────────────────────────────────────────────────

export function openPathScreen(unitId) {
  loadPrefs();
  showScreen('pathScreen');
  const u = unitId && getUnit(unitId);
  if (u) showUnit(u); else showMenu();
}

// ── Menu ─────────────────────────────────────────────────────────────────────

function showMenu() {
  const s = getScreen();
  const st = pathStats();
  const cont = nextOpenUnit();
  const dueAll = learnedDueItems().length;
  const level = LEVELS.find(l => l.id === pt.level);
  const units = unitsOf(pt.level);

  const levelBtn = l => {
    const us = unitsOf(l.id), d = us.filter(u => unitDone(u.id)).length;
    return `<button class="pt-level-btn ${pt.level === l.id ? 'active' : ''}" data-level="${l.id}" type="button">
      <span class="pt-level-id">${l.id}</span><span class="pt-level-meta">${d} / ${us.length}</span></button>`;
  };
  const unitRow = u => {
    const done = unitDone(u.id), started = unitStarted(u.id) || unitProgress(u) > 0;
    const pct = Math.round(unitProgress(u) * 100);
    return `<button class="pt-unit ${done ? 'done' : ''}" data-unit="${u.id}" type="button">
      <span class="pt-unit-num">${unitIndex(u)}</span>
      <span class="pt-unit-icon">${u.icon}</span>
      <span><span class="pt-unit-grammar-main">${escHtml(u.grammar)}</span><br><span class="pt-unit-grammar">${escHtml(u.title)}</span></span>
      <span class="pt-unit-status">${done ? '✓ done' : started ? `${pct}%` : ''}</span>
      ${started && !done ? `<span class="pt-unit-bar"><div style="width:${pct}%"></div></span>` : ''}
    </button>`;
  };

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" id="ptBack" type="button" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">${COURSE.icon} ${COURSE.name}</div>
        <div class="lesson-subtitle">Dutch from A2 to B2, one grammar point at a time</div>
      </div>
    </div>

    <div class="pt-stats-bar">
      <span class="pt-stat">📘 ${unitsDone()} / ${UNITS.length} units done</span>
      <span class="pt-stat">🧠 ${st.learned} / ${st.total} learned</span>
      <span class="pt-stat ${dueAll ? 'pt-stat-due' : ''}">🔄 ${dueAll} due</span>
    </div>

    ${cont ? `<button class="pt-continue" id="ptContinue" type="button">
      <span class="pt-continue-icon">${cont.icon}</span>
      <span><span class="pt-continue-title">▶ ${unitStarted(cont.id) ? 'Continue' : 'Start'}: ${escHtml(unitName(cont))}</span><br>
      <span class="pt-continue-sub">${escHtml(cont.grammar)}${dueAll ? ` · 🔁 ${dueAll} due from earlier units` : ''}</span></span>
    </button>` : `<div class="pt-empty">🎉 Every unit is done.</div>`}

    <div class="pt-section-label">Level</div>
    <div class="pt-level-row">${LEVELS.map(levelBtn).join('')}</div>
    <div class="pt-level-sub"><b>${escHtml(level.name)}</b> · ${escHtml(level.sub)}</div>

    <div class="pt-unit-list">
      ${units.length ? units.map(unitRow).join('') : `<div class="pt-empty">The units of this level are still being written.</div>`}
    </div>`;

  s.querySelector('#ptBack').addEventListener('click', () => showScreen('homeScreen'));
  s.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => { pt.level = b.dataset.level; savePrefs(); showMenu(); }));
  s.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => showUnit(getUnit(b.dataset.unit))));
  s.querySelector('#ptContinue')?.addEventListener('click', () => { pt.level = cont.level; savePrefs(); showUnit(cont); });
  s.scrollTo({ top: 0 });
}

// ── The explanation ──────────────────────────────────────────────────────────

// `code`, **bold**, *italic*. A single asterisk in front of a form stays as it is:
// that is how the texts mark a wrong form (never *ik werkt).
const INLINE = /`(.+?)`|\*\*(.+?)\*\*|\*(\S(?:[^*\n]*?\S)?)\*(?![\p{L}\p{N}*])/gu;
const markup = t => t.replace(INLINE, (m, code, bold, ital) => (code !== undefined ? `<code>${code}</code>` : bold !== undefined ? `<b>${markup(bold)}</b>` : `<i>${markup(ital)}</i>`));
export const inline = t => markup(escHtml(t));
// "> Dutch — English": the Dutch gets a 🔊 button (a line that quotes Ukrainian does not).
function exampleLine(t) {
  const i = t.indexOf(' — ');
  const nl = i === -1 ? t : t.slice(0, i), gloss = i === -1 ? '' : t.slice(i + 3);
  const speak = /[Ѐ-ӿ]/.test(nl) ? '' : sayBtn(nl.replace(/\*\*|`/g, ''));
  return `<div class="pt-ex-line"><span class="pt-ex-nl">${inline(nl)}</span> ${speak}${gloss ? ` <span class="pt-ex-gloss">${inline(gloss)}</span>` : ''}</div>`;
}
function table(lines) {
  const rows = lines.map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  return `<div class="pt-table-wrap"><table class="pt-table">
    <thead><tr>${rows[0].map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(1).map(r => `<tr>${r.map((c, i) => (i === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}
// Paragraphs, "- " bullets, "> Dutch — English" example lines, "### " headings,
// tables of | cells | (first line the header), **bold**, *italic*, `code`.
// A block may mix kinds (a sentence, then two example lines): consecutive lines
// of one kind form a run, and each run is rendered on its own.
const kindOf = l => (l.startsWith('- ') ? 'ul' : l.startsWith('> ') ? 'ex' : l.startsWith('|') ? 'tb' : /^#{1,4} /.test(l) ? 'h' : 'p');
export function renderExplain(text) {
  return String(text).trim().split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const runs = [];
    for (const l of lines) {
      const k = kindOf(l);
      if (runs.length && runs[runs.length - 1].k === k && k !== 'h') runs[runs.length - 1].lines.push(l);
      else runs.push({ k, lines: [l] });
    }
    return runs.map(({ k, lines }) => {
      if (k === 'ul') return `<ul>${lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      if (k === 'ex') return `<div class="pt-ex">${lines.map(l => exampleLine(l.slice(2))).join('')}</div>`;
      if (k === 'tb') return table(lines);
      if (k === 'h') return `<h4>${inline(lines[0].replace(/^#+ /, ''))}</h4>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }).join('');
}

// The rule of a unit, in short and in full, as a sheet over whatever is on screen:
// reading it in the middle of a round does not cost the learner her place.
export function openRuleSheet(unit) {
  openSheet({
    title: `${unit.icon} ${unit.grammar}`,
    html: `<div class="pt-rule">📌 ${inline(unit.summary || '')}</div><div class="pt-explain">${renderExplain(unit.explain)}</div>`,
    onOpen: wireSpeakButtons,
  });
}

// ── Unit page ────────────────────────────────────────────────────────────────

const dotClass = item => {
  const e = entryOf(item);
  if (!e || !e.a) return '';
  const r = e.c / e.a;
  return r >= 0.8 ? 'pt-dot-green' : r >= 0.5 ? 'pt-dot-yellow' : 'pt-dot-red';
};

// A round of this unit that was left half-way, if there is one worth picking up.
function resumeOf(unit) {
  const rec = getResume(unit.id);
  if (!rec || !Array.isArray(rec.plan) || !stepName(rec.step)) return null;
  // The unit was changed since the round was left: the plan no longer fits.
  if (!planCards(unit, rec.plan)) { clearResume(unit.id); return null; }
  if (rec.at >= rec.plan.length) {
    // Every card was answered, only the score card was not seen: the round counts.
    (rec.step === 'all' ? STEPS : [rec.step]).forEach(x => markUnitStep(unit.id, x));
    clearResume(unit.id);
    return null;
  }
  return rec;
}

// The page opens on what to do: pick up a round, or start the next step. What
// there is to read comes after it. The explanation lies open on a first visit and
// folds away once the unit is under way; the lists of words and sentences are
// reference and stay folded until asked for.
function showUnit(unit) {
  const s = getScreen();
  const items = unitItems(unit);
  const resume = resumeOf(unit);
  const st = unitState(unit.id);
  const next = nextUnit(unit);
  const due = learnedDueItems().length;
  const todo = STEPS.find(x => !st[x]);
  const fresh = !unitStarted(unit.id) && unitProgress(unit) === 0 && !resume;
  const g = grammarOf(unit.id);
  const cardCount = items.words.length * 3 + items.sentences.length * 2 + unit.exercises.length;
  const action = (id, icon, title, sub, step) => {
    const isNext = !resume && step && step === todo;
    return `
    <button class="pt-action ${isNext ? 'pt-action-next' : ''} ${step && st[step] ? 'done' : ''}" id="${id}" type="button">
      <span class="pt-action-icon">${icon}</span>
      <span class="pt-action-title">${step && st[step] ? '✓ ' : isNext ? '▶ ' : ''}${title}</span>
      <span class="pt-action-sub">${sub}</span>
    </button>`;
  };

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" id="ptUnitBack" type="button" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">${unit.icon} ${escHtml(unit.grammar)}</div>
        <div class="lesson-subtitle">${unit.level} · ${unitIndex(unit)} — ${escHtml(unit.title)}</div>
      </div>
    </div>

    <div class="pt-rule">📌 ${inline(unit.summary || '')}</div>

    ${resume ? `<button class="pt-resume" id="ptResume" type="button">
      <span class="pt-resume-title">▶ Pick up where you left off</span>
      <span class="pt-resume-sub">${stepName(resume.step)} · card ${resume.at + 1} of ${resume.plan.length}</span>
    </button>` : ''}

    <div class="pt-section-label">Practise</div>
    <div class="pt-actions">
      ${action('ptWords', '🧠', 'Learn the words', `${count(items.words.length, 'word')} · shown, recognised, then typed`, 'words')}
      ${action('ptSentences', '💬', 'Practise the sentences', `${count(items.sentences.length, 'sentence')} · typed from the English`, 'sentences')}
      ${action('ptExercises', '✍️', 'Grammar exercises', `${unit.exercises.length} · choose, fill in, word order, rewrite${g.pct != null ? ` · ${g.pct}% right lately` : ''}`, 'exercises')}
      ${action('ptAll', '⏩', 'Whole unit', `all three in one go · ${cardCount} cards`, null)}
    </div>
    ${fresh ? `<div class="pt-hint">Read the explanation below first, or just start: every word and sentence is shown before it is asked.</div>` : ''}
    ${due ? `<button class="pt-due-row" id="ptDue" type="button">
      <span>🔁 ${due} due from earlier units</span>
      <span class="pt-due-hint">Each step starts with a warm-up of up to 8 of them · tap for a full round</span>
    </button>` : ''}
    ${!todo && next ? `<button class="vc-browse-btn pt-next-top" id="ptNextTop" type="button">✓ Unit done · Next unit: ${escHtml(unitName(next))} →</button>` : ''}

    <details class="pt-card pt-fold" ${fresh ? 'open' : ''}>
      <summary class="pt-card-title">📖 Explanation · ${escHtml(unit.grammar)}</summary>
      <div class="pt-explain">${renderExplain(unit.explain)}</div>
    </details>

    <details class="pt-card pt-fold">
      <summary class="pt-card-title">🧠 Words · ${items.words.length}</summary>
      <div class="pt-words">
        ${items.words.map(w => `
          <div class="pt-word">
            <span><span class="pt-word-dot ${dotClass(w)}"></span><span class="pt-word-nl">${escHtml(w.shown)}</span><span class="pt-word-tag">${escHtml(wordForms(w))}</span></span>
            <span class="pt-word-meaning">${escHtml(w.en)}</span>
            ${sayBtn(w.shown)}
          </div>`).join('')}
      </div>
    </details>

    <details class="pt-card pt-fold">
      <summary class="pt-card-title">💬 Sentences · ${items.sentences.length}</summary>
      ${items.sentences.map(x => `
        <div class="pt-sentence">
          <div class="pt-sentence-nl"><span class="pt-word-dot ${dotClass(x)}"></span>${escHtml(x.nl)} ${sayBtn(x.nl)}</div>
          <div class="pt-sentence-native">${escHtml(x.en)}</div>
          ${x.note ? `<div class="pt-sentence-note">💡 ${inline(x.note)}</div>` : ''}
        </div>`).join('')}
    </details>

    ${next ? `<button class="vc-browse-btn" id="ptNext" type="button">Next unit: ${escHtml(unitName(next))} →</button>` : ''}`;

  wireSpeakButtons(s);
  s.querySelector('#ptUnitBack').addEventListener('click', () => { pt.level = unit.level; savePrefs(); showMenu(); });
  s.querySelector('#ptResume')?.addEventListener('click', () => startStep(unit, resume.step, resume));
  s.querySelector('#ptWords').addEventListener('click', () => startStep(unit, 'words'));
  s.querySelector('#ptSentences').addEventListener('click', () => startStep(unit, 'sentences'));
  s.querySelector('#ptExercises').addEventListener('click', () => startStep(unit, 'exercises'));
  s.querySelector('#ptAll').addEventListener('click', () => startStep(unit, 'all'));
  s.querySelector('#ptNext')?.addEventListener('click', () => showUnit(next));
  s.querySelector('#ptNextTop')?.addEventListener('click', () => showUnit(next));
  s.querySelector('#ptDue')?.addEventListener('click', () => startLearnedReview(unit));
  s.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

// ── Word cards ───────────────────────────────────────────────────────────────

// A typed word. A noun is learned and asked with its article: leaving it out is
// sent back, the wrong one is a miss. A near miss in the spelling gets one more try.
function checkWord(w, answer, tries) {
  const a = clean(answer);
  if (w.pos !== 'n') {
    const c = compare(a, w.accepted);
    // zich vergissen, wachten op: the word alone is half the answer.
    const parts = clean(w.nl).split(' ');
    if (!c.exact && parts.length > 1 && parts.includes(a) && tries < 2) return { retry: `There is more to it: it has ${parts.length} words.`, keep: true };
    return strictVerdict(answer, w.accepted, { tries, almost: 'Almost. Check the spelling and try once more.' });
  }
  const m = a.match(/^(de|het|een)\s+(.+)$/);
  const art = m ? m[1] : null, noun = m ? m[2] : a;
  const c = compare(noun, w.nl);
  const nounOk = c.exact || c.accent;
  if (!art && (nounOk || c.near) && tries < 2) return { retry: 'With its article: de or het?', keep: true };
  if (art === 'een' && (nounOk || c.near) && tries < 2) return { retry: 'With de or het, not een: the article is part of what you are learning.', keep: true };
  if (nounOk && art && !w.arts.includes(art)) return { ...wrong(`Right word, wrong article: it is ${w.shown}`), correct: w.shown, noOverride: true };
  if (nounOk && art) return c.exact ? { ...right(tries ? 3 : 5, tries ? 'Correct' : undefined), correct: `${art} ${w.nl}` } : { ...right(4, `Correct. Mind the accent: ${w.nl}`), correct: `${art} ${w.nl}` };
  if (c.near && tries === 0) return { retry: 'Almost. Check the spelling and try once more.', keep: true };
  return { ...wrong(), correct: w.accepted[0] };
}

// Three other meanings from the same unit, of the same kind of word where there are enough.
function distractors(w) {
  const unit = getUnit(w.unitId);
  const others = unitItems(unit).words.filter(o => o.key !== w.key && o.en !== w.en);
  const same = shuffle(others.filter(o => o.pos === w.pos)), rest = shuffle(others.filter(o => o.pos !== w.pos));
  return [...same, ...rest].slice(0, 3);
}

const wordLine = w => `<div class="pt-detail-full">${escHtml(w.shown)} ${sayBtn(w.shown)} <span class="pt-detail-forms">${escHtml(wordForms(w))}</span></div><div class="pt-detail-en">${escHtml(w.en)}</div>`;

// A word: shown first (intro), then recognised among four meanings, then typed.
//   dir 'produce'  the meaning is given, the Dutch is typed (with de/het)
//   dir 'recognise' the Dutch is given, the meaning is chosen
// practice: the answer is not put on the schedule (the recognising round of a
// new word, which comes before the typed one that counts).
function wordCard(w, { intro = false, dir = 'produce', practice = false } = {}) {
  const base = {
    key: w.key, course: COURSE, intro,
    record: res => (practice ? null : recordItem(w, res.quality)),
    detailHtml: intro ? '' : wordLine(w),
    missed: { left: w.en, right: w.shown, extra: wordForms(w), say: w.shown },
  };
  if (!intro && dir === 'recognise') {
    const options = shuffle([{ label: w.en, correct: true }, ...distractors(w).map(o => ({ label: o.en, correct: false }))]);
    return { ...base,
      promptHtml: `
        <div class="pt-q-card">
          <div class="pt-q-label">What does it mean?</div>
          <div class="pt-q-main">${escHtml(w.shown)} ${sayBtn(w.shown)}</div>
          <div class="pt-q-hint">${escHtml(wordTag(w))}</div>
        </div>`,
      autoSay: w.shown,
      input: { type: 'choice', options },
      check: () => null,
      override: null,
      correctText: w.en,
    };
  }
  let tries = 0;
  return { ...base,
    promptHtml: `
      <div class="pt-q-card ${intro ? 'pt-q-intro' : ''}">
        ${intro ? `<div class="pt-q-badge">✨ New word</div>` : `<div class="pt-q-label">In Dutch${w.pos === 'n' ? ', with de or het' : ''}</div>`}
        <div class="pt-q-main">${escHtml(w.en)}</div>
        ${intro ? `<div class="pt-q-word">${escHtml(w.shown)} ${sayBtn(w.shown)}</div>
                   <div class="pt-q-hint">${escHtml(wordTag(w))}</div>
                   <div class="pt-q-hint">Say it, then type it${w.pos === 'n' ? ' with its article' : ''}</div>`
                : `<div class="pt-q-hint">${escHtml(POS_NAME[w.pos] || w.pos)}</div>`}
      </div>`,
    autoSay: intro ? w.shown : null,
    input: { type: 'text', placeholder: 'Type the Dutch…' },
    check(answer) {
      const res = checkWord(w, answer, tries);
      if (res.retry) tries++;
      return res;
    },
    // Another word can be right too (beginnen where starten was asked).
    override: practice ? null : before => regradeItem(w, before, 4),
    correctText: w.accepted[0],
  };
}

// ── Sentence cards ───────────────────────────────────────────────────────────

// A sentence: shown with its note first (intro, copied), then typed from the English.
function sentenceCard(x, { intro = false, practice = false } = {}) {
  const note = x.note ? `<div class="pt-detail-note">💡 ${inline(x.note)}</div>` : '';
  let tries = 0;
  return {
    key: x.key, course: COURSE, intro,
    promptHtml: `
      <div class="pt-q-card ${intro ? 'pt-q-intro' : ''}">
        ${intro ? `<div class="pt-q-badge">✨ New sentence</div>` : `<div class="pt-q-label">Say this in Dutch</div>`}
        <div class="pt-q-main pt-q-main-sentence">${escHtml(x.en)}</div>
        ${intro ? `<div class="pt-q-sentence">${escHtml(x.nl)} ${sayBtn(x.nl)}</div>
                   ${x.note ? `<div class="pt-q-note">💡 ${inline(x.note)}</div>` : ''}
                   <div class="pt-q-hint">Read it, say it, then type it</div>`
                : `<div class="pt-hint-row">${(x.hint || []).map(h => `<span class="pt-hint-chip">${escHtml(h)}</span>`).join('')}</div>`}
      </div>`,
    autoSay: intro ? x.nl : null,
    input: { type: 'text', long: true, placeholder: 'Type the whole sentence…' },
    check(answer) {
      const res = strictVerdict(answer, x.accepted, { tries, almost: 'Almost. One or two letters are off: look at every word and ending, and correct it.' });
      if (res.retry) tries++;
      return res;
    },
    record: res => (practice ? null : recordItem(x, res.quality)),
    override: practice ? null : before => regradeItem(x, before, 4),
    diff: true,
    correctText: x.nl,
    // The sentence itself is shown in the comparison after a miss, here after a hit.
    detailHtml: intro ? '' : ({ res }) => (res.isExact ? `<div class="pt-detail-full">${escHtml(res.correct || x.nl)}</div>` : '') + note,
    say: x.nl, sayAfter: !intro,
    missed: { left: x.en, right: x.nl, extra: '' },
  };
}

// ── Exercise cards ───────────────────────────────────────────────────────────
// The five kinds of grammar exercise. They are practice, not scheduled: the
// result goes to the grammar point's record. Under every verdict: the whole
// sentence, what it means, why this is the answer, and the way to the full rule.

const NOTHING = '–';
const fill = (nl, piece) => nl.replace(/\s*\(([^)]*)\)/g, '').replace('___', piece === NOTHING ? '' : piece).replace(/\s+([.,!?])/g, '$1').replace(/\s+/g, ' ').trim();
const gapHtml = nl => escHtml(nl).replace(/___/g, '<span class="pt-q-gap">&nbsp;</span>');
const bag = text => clean(text).split(' ').sort().join(' ');

export function exerciseCard(unit, idx, { course = COURSE } = {}) {
  const x = unit.exercises[idx];
  const why = `
    <div class="pt-detail-en">${escHtml(x.en)}</div>
    <div class="pt-detail-note">💡 ${inline(x.note || '')}</div>
    <button class="pt-rule-btn" type="button">📖 The rule: ${escHtml(unit.grammar)}</button>`;
  const common = {
    key: `x:${unit.id}:${idx}`, course, intro: false,
    record: res => recordExercise(unit.id, idx, res.isCorrect),
    afterFeedback: root => root.querySelector('.pt-rule-btn')?.addEventListener('click', () => openRuleSheet(unit)),
  };
  const typed = { override: token => regradeExercise(token), diff: true };
  let tries = 0;
  const strict = (answer, almost) => { const res = strictVerdict(answer, x.answers, { tries, almost }); if (res.retry) tries++; return res; };
  // The right sentence is in the comparison after a miss; it is shown here after a hit.
  const fullAfterHit = ({ res }) => (res.isExact ? `<div class="pt-detail-full">${escHtml(res.correct || x.answers[0])}</div>` : '') + why;

  if (x.type === 'choose') {
    const full = fill(x.nl, x.options[x.correct]);
    return { ...common,
      promptHtml: `
        <div class="pt-q-card">
          <div class="pt-q-label">Which one fits?</div>
          <div class="pt-q-sentence">${gapHtml(x.nl)}</div>
          <div class="pt-q-native">${escHtml(x.en)}</div>
        </div>`,
      input: { type: 'choice', options: x.options.map((o, i) => ({ label: o === NOTHING ? '– (nothing)' : o, correct: i === x.correct })) },
      check: () => null,
      override: null,
      correctText: x.options[x.correct],
      detailHtml: `<div class="pt-detail-full">${escHtml(full)}</div>${why}`,
      say: full,
      missed: { left: x.nl, right: x.options[x.correct], extra: x.en, say: full },
    };
  }

  if (x.type === 'gap') {
    const full = fill(x.nl, x.answers[0]);
    return { ...common, ...typed, diff: false,
      promptHtml: `
        <div class="pt-q-card">
          <div class="pt-q-label">Fill the gap</div>
          <div class="pt-q-sentence">${gapHtml(x.nl)}</div>
          <div class="pt-q-native">${escHtml(x.en)}</div>
        </div>`,
      input: { type: 'text', placeholder: 'The missing word…' },
      // A gap is one form: a letter off is the mistake itself, so there is no second try.
      check(answer) {
        const c = compare(answer, x.answers);
        if (c.exact) return { ...right(5), correct: c.correct };
        if (c.accent) return { ...right(4, `Correct. Mind the accent: ${c.correct}`), correct: c.correct };
        return { ...wrong(), correct: c.correct };
      },
      correctText: x.answers[0],
      detailHtml: `<div class="pt-detail-full">${escHtml(full)}</div>${why}`,
      say: full,
      missed: { left: x.nl, right: x.answers[0], extra: x.en, say: full },
    };
  }

  if (x.type === 'order') {
    const pieces = shuffle(x.words);
    return { ...common, ...typed,
      promptHtml: `
        <div class="pt-q-card">
          <div class="pt-q-label">Put the pieces in the right order${x.lead ? `, starting with “${escHtml(x.lead)}”` : ''}</div>
          <div class="pt-q-main pt-q-main-sentence">${escHtml(x.en)}</div>
          <div class="ce-pieces">
            ${x.lead ? `<span class="ce-piece ce-piece-lead">${escHtml(x.lead)}</span>` : ''}
            ${pieces.map((p, i) => `<button class="ce-piece" type="button" data-piece="${i}">${escHtml(p)}</button>`).join('')}
            <button class="ce-piece-clear" type="button" aria-label="Start again">⌫</button>
          </div>
        </div>`,
      input: { type: 'text', long: true, placeholder: 'Tap the pieces, or type the sentence…', value: x.lead ? x.lead + ' ' : '' },
      // Tapping a piece adds it to the sentence; a piece that is in the sentence is
      // dimmed, and tapping it again takes it out. Typing works as well.
      mount({ root, input }) {
        const btns = [...root.querySelectorAll('[data-piece]')];
        const used = () => {
          let text = ` ${clean(input.value)} `;
          if (x.lead) text = text.replace(` ${clean(x.lead)} `, ' ');
          btns.forEach(b => {
            const p = ` ${clean(pieces[Number(b.dataset.piece)])} `;
            const at = text.indexOf(p);
            b.classList.toggle('used', at !== -1);
            if (at !== -1) text = text.slice(0, at) + ' ' + text.slice(at + p.length - 1);
          });
        };
        btns.forEach(b => b.addEventListener('click', () => {
          if (input.disabled) return;
          const p = pieces[Number(b.dataset.piece)];
          if (b.classList.contains('used')) {
            const at = input.value.toLowerCase().lastIndexOf(p.toLowerCase());
            if (at !== -1) input.value = (input.value.slice(0, at) + input.value.slice(at + p.length)).replace(/\s+/g, ' ').trimStart();
          } else {
            input.value = (input.value.trim() ? input.value.trim() + ' ' : '') + p;
          }
          input.dispatchEvent(new Event('input'));
          used();
        }));
        root.querySelector('.ce-piece-clear').addEventListener('click', () => {
          if (input.disabled) return;
          input.value = x.lead ? x.lead + ' ' : '';
          input.dispatchEvent(new Event('input'));
          used();
          input.focus();
        });
        input.addEventListener('input', used);
        used();
      },
      check(answer) {
        const c = compare(answer, x.answers);
        if (c.exact) return { ...right(5), correct: c.correct };
        if (c.accent) return { ...right(4, 'Correct'), correct: c.correct };
        if (bag(answer) === bag(x.answers[0])) return { ...wrong('The words are right, the order is not'), correct: c.correct };
        if (tries < 1) { tries++; return { retry: 'Use every piece once, and nothing else.', keep: true }; }
        return { ...wrong(), correct: c.correct };
      },
      correctText: x.answers[0],
      detailHtml: fullAfterHit,
      say: x.answers[0],
      missed: { left: x.en, right: x.answers[0], extra: '', say: x.answers[0] },
    };
  }

  if (x.type === 'rewrite') {
    return { ...common, ...typed,
      promptHtml: `
        <div class="pt-q-card">
          <div class="pt-q-label">Rewrite</div>
          <div class="pt-q-task">${inline(x.task)}</div>
          <div class="pt-q-sentence">${escHtml(x.from)} ${sayBtn(x.from)}</div>
        </div>`,
      input: { type: 'text', long: true, placeholder: 'Type the new sentence…' },
      check(answer) {
        if (clean(answer) === clean(x.from) && tries < 2) { tries++; return { retry: 'That is the sentence as it was. Change it the way the task says.', keep: true }; }
        return strict(answer, 'Almost. One or two letters are off: look at every word and ending, and correct it.');
      },
      correctText: x.answers[0],
      detailHtml: fullAfterHit,
      say: x.answers[0],
      missed: { left: x.from, right: x.answers[0], extra: x.task, say: x.answers[0] },
    };
  }

  // fix: the sentence with its one mistake is in the field, to be put right.
  return { ...common, ...typed,
    promptHtml: `
      <div class="pt-q-card">
        <div class="pt-q-label">One mistake. Correct the sentence.</div>
        <div class="pt-q-sentence pt-q-wrong">${escHtml(x.wrong)}</div>
        <div class="pt-q-native">${escHtml(x.en)}</div>
      </div>`,
    input: { type: 'text', long: true, placeholder: 'Type the sentence correctly…', value: x.wrong },
    check(answer) {
      if (clean(answer) === clean(x.wrong)) {
        if (tries < 2) { tries++; return { retry: 'Nothing was changed yet: one thing in this sentence is wrong.', keep: true }; }
        return { ...wrong(), correct: x.answers[0] };
      }
      const c = compare(answer, x.answers);
      if (c.exact) return { ...right(5), correct: c.correct };
      if (c.accent) return { ...right(4, 'Correct'), correct: c.correct };
      return { ...wrong(), correct: c.correct };
    },
    correctText: x.answers[0],
    detailHtml: fullAfterHit,
    say: x.answers[0],
    missed: { left: x.wrong, right: x.answers[0], extra: '', say: x.answers[0] },
  };
}

// ── Sessions ─────────────────────────────────────────────────────────────────

// A step is planned as a list of [kind, ref] pairs and its cards are made from
// that plan. The plan is what is kept when a round is left half-way: the same
// cards in the same order can be made again, and the round picked up where it stopped.
//   wi / wr / wp   a word: introduced, recognised (practice), produced   (ref = the word's key)
//   si / s         a sentence: introduced, typed                         (ref = the sentence's key)
//   x              an exercise                                           (ref = its place in the unit)
// New material comes in groups of five or six: shown, then asked, before the next group.
function groups(list, size) {
  const n = Math.max(1, Math.ceil(list.length / size)), per = Math.ceil(list.length / n);
  return Array.from({ length: n }, (_, i) => list.slice(i * per, (i + 1) * per)).filter(g => g.length);
}
function stepPlan(unit, step) {
  const items = unitItems(unit);
  const keys = list => list.map(i => i.key);
  if (step === 'words') {
    return groups(keys(items.words), 6).flatMap(g => [
      ...g.map(k => ['wi', k]),
      ...shuffle(g).map(k => ['wr', k]),
      ...shuffle(g).map(k => ['wp', k]),
    ]);
  }
  if (step === 'sentences') return groups(keys(items.sentences), 5).flatMap(g => [...g.map(k => ['si', k]), ...shuffle(g).map(k => ['s', k])]);
  // The exercises keep the order they were written in: from easy to hard.
  if (step === 'exercises') return unit.exercises.map((_, i) => ['x', i]);
  return [...stepPlan(unit, 'words'), ...stepPlan(unit, 'sentences'), ...stepPlan(unit, 'exercises')];
}
// The cards of a plan, or null when the unit no longer has what the plan names.
function planCards(unit, plan) {
  const items = unitItems(unit);
  const make = ([kind, ref]) => {
    if (kind === 'x') return unit.exercises[ref] ? exerciseCard(unit, ref) : null;
    if (kind === 'si' || kind === 's') { const x = items.sentences.find(i => i.key === ref); return x ? sentenceCard(x, { intro: kind === 'si' }) : null; }
    const w = items.words.find(i => i.key === ref);
    if (!w) return null;
    if (kind === 'wi') return wordCard(w, { intro: true });
    if (kind === 'wr') return wordCard(w, { dir: 'recognise', practice: true });
    if (kind === 'wp') return wordCard(w, { dir: 'produce' });
    return null;
  };
  const cards = plan.map(make);
  return cards.every(Boolean) ? cards : null;
}

const stepName = step => ({ words: 'Words', sentences: 'Sentences', exercises: 'Exercises', all: 'Whole unit' })[step];

// rec: a round of this unit that was left half-way; its plan and position are used again.
function startStep(unit, step, rec = null) {
  let plan = rec ? rec.plan : stepPlan(unit, step);
  let cards = planCards(unit, plan);
  if (!cards) { clearResume(unit.id); rec = null; plan = stepPlan(unit, step); cards = planCards(unit, plan); }
  if (!cards || !cards.length) { showUnit(unit); return; }
  const done = step === 'all' ? STEPS : [step];
  runSession({
    screen: getScreen(), icon: unit.icon, title: `${unit.level} · ${unitIndex(unit)} · ${stepName(step)}`, accent: ACCENT, cards, warmUp: 8, warmUpSource,
    resume: rec ? { at: rec.at, score: rec.score, missed: rec.missed } : null,
    // Kept after every answer: leaving a long round costs nothing.
    onProgress: ({ at, score, missed }) => saveResume(unit.id, { step, plan, at, score, missed }),
    onExit: () => showUnit(unit),
    scoreSubtitle: () => unitName(unit),
    // The step is done once the round ends; offer the next step, or the next unit.
    again: () => {
      clearResume(unit.id);
      done.forEach(s => markUnitStep(unit.id, s));
      const st = unitState(unit.id);
      const todo = STEPS.find(s => !st[s]);
      if (todo) return { label: `▶ Next: ${stepName(todo)}`, run: () => startStep(unit, todo) };
      const next = nextUnit(unit);
      return next ? { label: `→ Next unit: ${next.grammar}`, run: () => showUnit(next) } : null;
    },
  });
}

// ── The path's own review ───────────────────────────────────────────────────
// Due words and sentences from the units already done: the warm-up of every
// step, and a full round from the unit page.
const anyCard = i => (i.kind === 'sentence' ? sentenceCard(i) : wordCard(i, { dir: Math.random() < 0.7 ? 'produce' : 'recognise' }));
const learnedDueCards = () => learnedDueItems().map(anyCard);
// Warm-up material: what is due, then what comes up soonest as practice only
// (nothing recorded), so a step always opens with a few familiar items.
const asPractice = i => (i.kind === 'sentence' ? sentenceCard(i, { practice: true }) : wordCard(i, { dir: 'produce', practice: true }));
const warmUpSource = () => [
  ...shuffle(learnedDueCards()),
  ...learnedSoonItems().slice(0, 8).map(i => ({ ...asPractice(i), practice: true })),
];
function startLearnedReview(unit) {
  runSession({
    screen: getScreen(), icon: '🔁', title: 'Review from earlier units', accent: ACCENT,
    cards: shuffle(learnedDueCards()).slice(0, 30),
    onExit: () => showUnit(unit),
    again: () => { const left = learnedDueItems().length; return left ? { label: `🔄 Keep going: ${left} left`, run: () => startLearnedReview(unit) } : null; },
  });
}

// The words and sentences that go wrong more often than right, as a round.
export function startPathWeak() {
  loadPrefs();
  showScreen('pathScreen');
  const weak = weakItems();
  if (!weak.length) { showMenu(); return; }
  runSession({
    screen: getScreen(), icon: '🎯', title: 'Weak words and sentences', accent: ACCENT,
    cards: shuffle(weak).slice(0, 25).map(i => (i.kind === 'sentence' ? sentenceCard(i) : wordCard(i, { dir: 'produce' }))),
    onExit: showMenu,
    again: () => null,
  });
}

// ── Review ───────────────────────────────────────────────────────────────────

export const pathDueCards = () => dueItems().map(anyCard);

export function startPathReview() {
  showScreen('reviewScreen');
  runSession({
    screen: document.getElementById('reviewScreen'), icon: COURSE.icon, title: COURSE.name, accent: ACCENT,
    cards: shuffle(pathDueCards()).slice(0, 30),
    onExit: () => window.openReviewScreen(),
    again: () => { const left = dueItems().length; return left ? { label: `🔄 Keep going: ${left} left`, run: startPathReview } : null; },
  });
}
