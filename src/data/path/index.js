// ── The course: Dutch from A2 to B2, one grammar point per unit ───────────────
// The units are written as JSON files in tools/path/units (one per unit, the
// guide is tools/path/spec.md, the plan tools/path/syllabus.json) and assembled
// into a2.js, b1.js and b2.js by tools/path/assemble.mjs. Their order is the
// order of the syllabus. Ids never change: progress is stored under them.
//
// A unit:
//   id 'a2-04' · level 'A2' · icon
//   title      what the unit is about (the theme of its words)
//   grammar    the grammar point, a few words
//   summary    the rule in one or two sentences
//   explain    the explanation, in a light markup (see renderExplain in path-ui.js)
//   words      [{ nl, en, pos, art, pl | past, perf | tag }]   14–16 new words
//   sentences  [{ nl, en, hint, note, alt? }]                  10 that use the grammar point
//   exercises  [{ type: choose | gap | order | rewrite | fix, …, en, note }]   14–16

import { A2 } from './a2.js';
import { B1 } from './b1.js';
import { B2 } from './b2.js';

export const LEVELS = [
  { id: 'A2', name: 'The foundations, done properly', sub: 'Verb forms, word order, de and het, the past tenses, the small words every sentence needs' },
  { id: 'B1', name: 'Building real sentences', sub: 'Sub-clauses, relative clauses, er, the passive, zou, and the spelling of d and t' },
  { id: 'B2', name: 'Precise and formal Dutch', sub: 'Complex verb groups, formal connectors, nuance, register and long sentences' },
];

export const UNITS = [...A2, ...B1, ...B2];

const byId = new Map(UNITS.map(u => [u.id, u]));
const byLevel = new Map(LEVELS.map(l => [l.id, UNITS.filter(u => u.level === l.id)]));

export const getUnit = id => byId.get(id) || null;
export const unitsOf = level => byLevel.get(level) || [];
// The number the learner sees: the unit's place in its level.
export const unitIndex = u => unitsOf(u.level).indexOf(u) + 1;
export const nextUnit = u => UNITS[UNITS.indexOf(u) + 1] || null;
export const unitName = u => `${u.level} · ${unitIndex(u)} — ${u.title}`;
