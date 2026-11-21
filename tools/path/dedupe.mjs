#!/usr/bin/env node
// A word is taught in one unit only. Walk the units in syllabus order and drop
// from a later unit any word an earlier unit already teaches (the learner has it
// by then; it stays in that unit's sentences). Never below 12 words a unit.
//   node tools/path/dedupe.mjs [--write]
// Without --write it only reports.

import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, 'units');
const write = process.argv.includes('--write');
const FLOOR = 12;
const order = JSON.parse(fs.readFileSync(path.join(here, 'syllabus.json'), 'utf8')).units.map(u => u.id);
const units = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  .map(f => ({ f, u: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }))
  .sort((a, b) => order.indexOf(a.u.id) - order.indexOf(b.u.id));

// The same spelling with another article (de stof, het stof) or another meaning
// (het recept: a prescription, a recipe) is another word and stays. The app decides
// the same way (src/data/path-progress.js).
const cores = en => new Set(String(en).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter(w => w.length > 2 && w !== 'the'));
const sameMeaning = (a, b) => { const x = cores(a), y = cores(b); return [...x].some(w => y.has(w)) || !x.size || !y.size; };
const seen = new Map(), meaning = new Map();
let dropped = 0, kept = 0;
for (const { f, u } of units) {
  const keep = [], gone = [], stay = [];
  let room = Math.max(0, u.words.length - FLOOR);
  for (const w of u.words) {
    const k = `${w.nl}|${w.pos}|${w.art || ''}`;
    if (seen.has(k) && !sameMeaning(meaning.get(k), w.en)) { console.log(`${u.id}: "${w.nl}" (${w.en}) is also in ${seen.get(k)} (${meaning.get(k)}): another meaning, kept`); keep.push(w); continue; }
    if (seen.has(k) && room > 0) { gone.push(`${w.nl} (${seen.get(k)})`); room--; }
    else { if (seen.has(k)) stay.push(`${w.nl} (${seen.get(k)})`); else { seen.set(k, u.id); meaning.set(k, w.en); } keep.push(w); }
  }
  if (gone.length) {
    dropped += gone.length;
    console.log(`${u.id}: drop ${gone.length} → ${keep.length} words left · ${gone.join(', ')}`);
    if (write) { u.words = keep; fs.writeFileSync(path.join(dir, f), JSON.stringify(u, null, 2) + '\n'); }
  }
  if (stay.length) { kept += stay.length; console.log(`${u.id}: taught before but kept (the unit would get too short) · ${stay.join(', ')}`); }
}
console.log(`\n${dropped} repeated words ${write ? 'dropped' : 'found (run with --write to drop them)'}, ${kept} kept; ${seen.size} different words over ${units.length} units`);
