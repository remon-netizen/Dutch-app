#!/usr/bin/env node
// What a writer needs to know about the units they are to write:
// the whole course in one line per unit, then the full plan of the units named.
//   node tools/path/brief.mjs a2-03 a2-04

import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const syl = JSON.parse(fs.readFileSync(path.join(here, 'syllabus.json'), 'utf8'));
const ids = process.argv.slice(2);
const written = new Set(fs.readdirSync(path.join(here, 'units')).map(f => f.replace('.json', '')));

console.log('THE COURSE (✓ = written), in teaching order:\n');
for (const u of syl.units) console.log(`${written.has(u.id) ? '✓' : ' '} ${u.id}  ${u.grammar}  ·  theme: ${u.theme}`);

console.log('\n\nYOUR UNITS:\n');
for (const id of ids) {
  const u = syl.units.find(x => x.id === id);
  if (!u) { console.log(`${id}: not in the syllabus\n`); continue; }
  console.log(JSON.stringify({ id: u.id, level: u.level, icon: u.icon, title: u.title, grammar: u.grammar }, null, 2));
  console.log(`theme of the words: ${u.theme}`);
  console.log(`scope: ${u.scope}\n`);
}
