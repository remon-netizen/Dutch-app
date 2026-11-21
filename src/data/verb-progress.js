// ── Irregular verbs: progress ────────────────────────────────────────────────
// Two items per verb on the shared schedule: its simple past and its perfect.
// They are scheduled apart, so the form that goes wrong is the one that comes back.

import { makeProgress } from './course-progress.js';
import { VERBS } from './strong-verbs.js';

export const pastKey = v => `sv:${v.inf}:past`;
export const perfKey = v => `sv:${v.inf}:perf`;
export const keysOf = v => (v.part ? [pastKey(v), perfKey(v)] : [pastKey(v)]);

const progress = makeProgress('verbProgress', () => VERBS.flatMap(keysOf));

export const verbEntry = key => progress.get(key);
export const recordVerb = (key, quality) => progress.record(key, quality);
export const regradeVerb = (key, before, quality) => progress.regrade(key, before, quality);
export const verbStats = () => progress.stats();
export const dueVerbKeys = () => progress.dueKeys();
export const weakVerbKeys = () => progress.weakKeys();

// A verb is new until its simple past has been asked once.
export const isNewVerb = v => !progress.get(pastKey(v));
// Learned: every form of it answered correctly at least twice.
export const isLearnedVerb = v => keysOf(v).every(k => (progress.get(k)?.c || 0) >= 2);
