// ── De or het: progress ──────────────────────────────────────────────────────
// One item per noun on the shared schedule. The everyday nouns (data/nouns.js)
// are always part of it; a noun of the course joins when its unit's words have
// been learned, so nothing is asked that was never met.

import { makeProgress } from './course-progress.js';
import { NOUNS } from './nouns.js';
import { UNITS } from './path/index.js';
import { unitState } from './path-progress.js';

export const nounKey = n => `dh:${n.nl}`;

// The nouns of the course units, with one article (a word that takes both has nothing to ask).
let courseNouns = null;
const fromCourse = () => (courseNouns ||= UNITS.flatMap(u => u.words
  .filter(w => w.pos === 'n' && (w.art === 'de' || w.art === 'het') && !/\s/.test(w.nl))
  .map(w => ({ nl: w.nl, en: w.en, art: w.art, pl: w.pl || '', set: 'course', unitId: u.id }))));

// Every noun that can be asked now, the everyday ones first; a word is in it once.
export function allNouns() {
  const seen = new Set(), out = [];
  for (const n of [...NOUNS, ...fromCourse().filter(n => unitState(n.unitId).words)]) {
    if (seen.has(n.nl)) continue;
    seen.add(n.nl);
    out.push(n);
  }
  return out;
}

// The schedule knows every noun there could be, so progress is never dropped
// when a unit's step is counted differently.
const progress = makeProgress('dehetProgress', () => [...new Set([...NOUNS, ...fromCourse()].map(nounKey))]);

export const nounEntry = n => progress.get(nounKey(n));
export const recordNoun = (n, quality) => progress.record(nounKey(n), quality);
export const isNewNoun = n => !progress.get(nounKey(n));
export const isLearnedNoun = n => (progress.get(nounKey(n))?.c || 0) >= 2;
const isDue = (e, now) => e && e.nextReview <= now;
const isWeak = e => e && e.a > 0 && e.c / e.a < 0.5;

export const dueNouns = () => { const now = Date.now(); return allNouns().filter(n => isDue(nounEntry(n), now)); };
export const weakNouns = () => allNouns().filter(n => isWeak(nounEntry(n)));
export function dehetStats() {
  const entries = allNouns().map(nounEntry), now = Date.now();
  return {
    total: entries.length,
    seen: entries.filter(Boolean).length,
    learned: entries.filter(e => e && e.c >= 2).length,
    due: entries.filter(e => isDue(e, now)).length,
    weak: entries.filter(isWeak).length,
  };
}
