#!/usr/bin/env node
// Print the rule texts of units for someone who checks the grammar: per unit the
// grammar point, the rule in short and the full explanation, without the rest.
//   node tools/path/sheet.mjs A2            a whole level
//   node tools/path/sheet.mjs b1-05 b1-06   the units named

import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const order = JSON.parse(fs.readFileSync(path.join(here, 'syllabus.json'), 'utf8')).units.map(u => u.id);
const want = process.argv.slice(2);
const ids = order.filter(id => want.includes(id) || want.includes(id.slice(0, 2).toUpperCase()));
for (const id of ids) {
  const u = JSON.parse(fs.readFileSync(path.join(here, 'units', `${id}.json`), 'utf8'));
  console.log(`\n${'═'.repeat(78)}\n${u.id} · ${u.grammar}   (file: tools/path/units/${u.id}.json)\n${'═'.repeat(78)}`);
  console.log(`SUMMARY: ${u.summary}\n`);
  console.log(u.explain);
}
