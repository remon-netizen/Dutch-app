// ── Course progress ───────────────────────────────────────────────────────────
// One progress store per course (the course path, the irregular verbs, de/het),
// each under its own storage key, all on the same schedule. Sessions are run by
// grammar/course-engine.js.

import { loadJSON, saveJSON } from '../store.js';
import { markActivity } from './activity.js';

// ── The schedule (SM-2) ──────────────────────────────────────────────────────
// quality: 5 produced exactly · 4 right the easier way · 3 right at the second try · 1 wrong
// A right answer pushes the item further away (1 day, 6 days, then times its
// ease factor); a wrong one brings it back tomorrow and makes it come more often.
export function schedule(entry, quality) {
  let { interval = 0, easeFactor = 2.5, repetitions = 0 } = entry;
  if (quality >= 3) {
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    repetitions++;
  } else {
    interval = 1;
    repetitions = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }
  return { ...entry, interval, easeFactor, repetitions, nextReview: Date.now() + interval * 86_400_000 };
}

// { [key]: { interval, easeFactor, repetitions, nextReview, a, c, t } }
//   a answers · c correct ones · t when last answered
export function makeProgress(storageKey, allKeys) {
  let data = null, known = null;
  const load = () => (data ||= loadJSON(storageKey, {}));
  const save = () => saveJSON(storageKey, data);
  const keys = () => allKeys();
  const has = key => (known ||= new Set(keys())).has(key);
  let activity = true;

  const api = {
    get: key => load()[key] || null,
    has,
    // Returns the entry as it was before, so a wrong verdict can be taken back.
    record(key, quality) {
      if (!has(key)) return null;
      const d = load();
      const before = d[key] || null;
      const prev = before || { a: 0, c: 0 };
      const next = schedule(prev, quality);
      next.a = prev.a + 1;
      next.c = prev.c + (quality >= 3 ? 1 : 0);
      next.t = Date.now();
      d[key] = next;
      save();
      if (activity) markActivity();
      return before;
    },
    // "My answer was right too": put the entry back and grade the answer again.
    regrade(key, before, quality) {
      const d = load();
      if (before) d[key] = before; else delete d[key];
      activity = false;            // the first verdict already counted as activity
      api.record(key, quality);
      activity = true;
    },
    dueKeys()     { const d = load(), now = Date.now(); return keys().filter(k => d[k] && d[k].nextReview <= now); },
    unseenKeys()  { const d = load(); return keys().filter(k => !d[k]); },
    seenKeys()    { const d = load(); return keys().filter(k => d[k]); },
    // learned = answered correctly at least twice
    learnedKeys() { const d = load(); return keys().filter(k => d[k] && d[k].c >= 2); },
    weakKeys()    { const d = load(); return keys().filter(k => d[k] && d[k].a > 0 && d[k].c / d[k].a < 0.5); },
    stats() {
      return { total: keys().length, seen: api.seenKeys().length, learned: api.learnedKeys().length, due: api.dueKeys().length, weak: api.weakKeys().length };
    },
  };
  return api;
}
