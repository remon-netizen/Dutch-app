// ── Grammar exercises: how each grammar point is going ────────────────────────
// The exercises of a unit are free practice: they are not on the review
// schedule. What is kept is how the learner does on each grammar point (a unit),
// so the Grammar screen can show where she slips and bring back the exercises
// she got wrong.
//   { [unitId]: { a, c, last, miss, t } } under 'grammarStats'
//     a answers · c correct ones
//     last   the latest results, oldest first, as a string of 1 and 0 (at most 12)
//     miss   the exercises (their place in the unit) last answered wrong
//     t      when the point was last practised

import { loadJSON, saveJSON } from '../store.js';
import { markActivity } from './activity.js';

const KEY = 'grammarStats';
const KEEP = 12;
let data = null;
const load = () => (data ||= loadJSON(KEY, {}));
const save = () => saveJSON(KEY, data);

// Returns a token with which the verdict can be turned round ("my answer was right too").
export function recordExercise(unitId, idx, ok) {
  const d = load();
  const e = d[unitId] || { a: 0, c: 0, last: '', miss: [] };
  const token = { unitId, idx, before: { ...e, miss: [...e.miss] } };
  e.a++;
  if (ok) e.c++;
  e.last = (e.last + (ok ? '1' : '0')).slice(-KEEP);
  e.miss = e.miss.filter(i => i !== idx);
  if (!ok) e.miss.push(idx);
  e.t = Date.now();
  d[unitId] = e;
  save();
  markActivity();
  return token;
}

export function regradeExercise(token) {
  if (!token) return;
  const d = load();
  const e = { ...token.before, miss: [...token.before.miss] };
  e.a++; e.c++;
  e.last = (e.last + '1').slice(-KEEP);
  e.miss = e.miss.filter(i => i !== token.idx);
  e.t = Date.now();
  d[token.unitId] = e;
  save();
}

// How a grammar point stands: pct over the latest answers, or null when it was never practised.
export function grammarOf(unitId) {
  const e = load()[unitId];
  if (!e || !e.a) return { a: 0, c: 0, n: 0, pct: null, miss: [], t: 0 };
  const n = e.last.length, good = [...e.last].filter(x => x === '1').length;
  return { a: e.a, c: e.c, n, pct: Math.round(good / n * 100), miss: e.miss, t: e.t };
}

// A point is weak when, over at least five recent answers, fewer than 70% were right.
export const WEAK_BELOW = 70, WEAK_FROM = 5;
export const isWeakPoint = unitId => { const g = grammarOf(unitId); return g.n >= WEAK_FROM && g.pct < WEAK_BELOW; };
export const practisedIds = () => Object.keys(load()).filter(id => load()[id].a > 0);
export const weakPointIds = () => practisedIds().filter(isWeakPoint);

export function grammarTotals() {
  const ids = practisedIds();
  let a = 0, c = 0;
  for (const id of ids) { a += load()[id].a; c += load()[id].c; }
  return { points: ids.length, answers: a, correct: c, weak: weakPointIds().length };
}
