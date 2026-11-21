// ── Course path: items and progress ──────────────────────────────────────────
// Every unit's words and sentences are items on the shared schedule
// (course-progress.js), kept under 'pathProgress'. Which steps of a unit were
// done is kept under 'pathUnits', a round left half-way under 'pathResume'.
// (The grammar exercises are not scheduled; their results are in grammar-progress.js.)

import { makeProgress } from './course-progress.js';
import { loadJSON, saveJSON } from '../store.js';
import { UNITS } from './path/index.js';

// A unit's words and sentences in the shape the cards want.
//   word      shown: the word as it is learned, a noun with its article (het kantoor)
//             accepted: every form that is right when it is typed
// A word has one item, whichever unit lists it: a word that two units share (it
// should not happen, tools/path/dedupe.mjs takes those out) is learned once. The
// same spelling with another article (de stof, het stof) or with another meaning
// (het recept: a prescription, a recipe) is another word, with an item of its own.
const cores = en => new Set(String(en).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter(w => w.length > 2 && w !== 'the'));
const sameMeaning = (a, b) => { const x = cores(a), y = cores(b); return [...x].some(w => y.has(w)) || !x.size || !y.size; };
let built = null;
function build() {
  const byUnit = new Map(), all = [], firstOf = new Map();
  for (const unit of UNITS) {
    const words = unit.words.map(w => {
      const arts = w.pos === 'n' ? String(w.art || 'de').split('/') : null;
      const base = `w:${w.pos}:${arts ? arts.join('/') + ' ' : ''}${w.nl}`;
      const first = firstOf.get(base);
      const key = first && !sameMeaning(first.en, w.en) ? `${base}#${unit.id}` : base;
      const item = { ...w, key, kind: 'word', unitId: unit.id, arts,
                     shown: arts ? `${arts.join('/')} ${w.nl}` : w.nl,
                     accepted: arts ? arts.map(a => `${a} ${w.nl}`) : [w.nl] };
      if (!first) firstOf.set(base, item);
      return item;
    });
    const sentences = unit.sentences.map((s, i) => ({ ...s, key: `s:${unit.id}:${i}`, kind: 'sentence', unitId: unit.id, accepted: [s.nl, ...(s.alt || [])] }));
    byUnit.set(unit.id, { words, sentences, all: [...words, ...sentences] });
  }
  const seen = new Set();
  for (const it of [...byUnit.values()].flatMap(x => x.all)) if (!seen.has(it.key)) { seen.add(it.key); all.push(it); }
  return { byUnit, all };
}
export const unitItems = unit => (built ||= build()).byUnit.get(unit.id);
// Every item once, in the order of the course.
const allItems = () => (built ||= build()).all;

const progress = makeProgress('pathProgress', () => allItems().map(i => i.key));

export const entryOf = item => progress.get(item.key);
// quality: 5 exact · 4 chosen, or right but for an accent · 3 right at the second try · 1 wrong.
// Returns the entry as it was.
export const recordItem = (item, quality) => progress.record(item.key, quality);
export const regradeItem = (item, before, quality) => progress.regrade(item.key, before, quality);

const isDue = (e, now) => e && e.nextReview <= now;
const isWeak = e => e && e.a > 0 && e.c / e.a < 0.5;

export function dueItems() {
  const now = Date.now();
  return allItems().filter(i => isDue(entryOf(i), now));
}
export const weakItems = () => allItems().filter(i => isWeak(entryOf(i)));

export function pathStats() {
  const entries = allItems().map(entryOf);
  const now = Date.now();
  return {
    total: entries.length,
    seen: entries.filter(Boolean).length,
    learned: entries.filter(e => e && e.c >= 2).length,
    due: entries.filter(e => isDue(e, now)).length,
    weak: entries.filter(isWeak).length,
  };
}

// What the learner has actually done in the path: the words of units whose words
// step is done, the sentences of units whose sentences step is done.
const learnedItems = () => UNITS.flatMap(u => {
  const st = unitState(u.id), it = unitItems(u);
  return [...(st.words ? it.words : []), ...(st.sentences ? it.sentences : [])];
});
// Due among those: the path's own warm-up material.
export function learnedDueItems() {
  const now = Date.now();
  return learnedItems().filter(i => isDue(entryOf(i), now));
}
// The same material that is not due yet, soonest first: fills a warm-up when
// little or nothing is due, as practice that leaves the schedule alone.
export function learnedSoonItems() {
  const now = Date.now();
  return learnedItems().map(i => ({ i, e: entryOf(i) })).filter(x => x.e && x.e.nextReview > now)
    .sort((a, b) => a.e.nextReview - b.e.nextReview).map(x => x.i);
}

// How far a unit is: the share of its items that were met at least once.
export function unitProgress(unit) {
  const items = unitItems(unit).all;
  if (!items.length) return 0;
  return items.filter(i => entryOf(i)).length / items.length;
}

// ── Unit steps ───────────────────────────────────────────────────────────────
// { [unitId]: { words, sentences, exercises } } — timestamps of when each step was done.

const STEPS_KEY = 'pathUnits';
export const STEPS = ['words', 'sentences', 'exercises'];
let steps = null;
const loadSteps = () => (steps ||= loadJSON(STEPS_KEY, {}));
export const unitState = id => loadSteps()[id] || {};
export function markUnitStep(id, step) {
  const d = loadSteps();
  d[id] = { ...(d[id] || {}), [step]: Date.now() };
  saveJSON(STEPS_KEY, d);
}
export const unitDone = id => STEPS.every(s => unitState(id)[s]);
// The unit to continue with: the first one not finished.
export const nextOpenUnit = () => UNITS.find(u => !unitDone(u.id)) || null;
export const unitStarted = id => Object.keys(unitState(id)).length > 0;
export const unitsDone = () => UNITS.filter(u => unitDone(u.id)).length;

// ── A round left half-way ────────────────────────────────────────────────────
// { [unitId]: { step, plan, at, score, missed, t } } under 'pathResume': the cards
// of the round in their order (see stepPlan in path-ui.js) and how many of them
// were answered. Written after every answer, removed when the round reaches its
// score card, so leaving a long round costs nothing.
const RESUME_KEY = 'pathResume';
const loadResume = () => loadJSON(RESUME_KEY, {});
export const getResume = id => loadResume()[id] || null;
export function saveResume(id, rec) {
  const d = loadResume();
  d[id] = { ...rec, t: Date.now() };
  saveJSON(RESUME_KEY, d);
}
export function clearResume(id) {
  const d = loadResume();
  if (!d[id]) return;
  delete d[id];
  saveJSON(RESUME_KEY, d);
}
