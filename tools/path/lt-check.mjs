#!/usr/bin/env node
// Run every Dutch string of the units through LanguageTool (public API, nl).
// One request per unit, paced for the free tier.
//   node tools/path/lt-check.mjs [--only a2-03,a2-04] [--out report.json]
// Names, loanwords and deliberately wrong forms show up as matches: the list is
// for a reader to judge, not an automatic verdict.

import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, 'units');
const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fill = (nl, piece) => nl.replace(/\s*\(([^)]*)\)/g, '').replace('___', piece === '–' ? '' : piece).replace(/\s+([.,!?])/g, '$1').replace(/\s+/g, ' ').trim();

// Every correct Dutch sentence or word of a unit, each on its own line.
export function dutchStrings(u) {
  const lines = [];
  for (const m of (u.explain || '').matchAll(/^> (.+?)(?: — .*)?$/gm)) lines.push(m[1].replace(/\*\*|`/g, ''));
  for (const w of u.words || []) lines.push(w.pos === 'n' ? `${String(w.art).split('/')[0]} ${w.nl}` : w.nl);
  for (const s of u.sentences || []) lines.push(s.nl, ...(s.alt || []));
  for (const x of u.exercises || []) {
    if (x.type === 'choose') lines.push(fill(x.nl, x.options[x.correct]));
    else if (x.type === 'gap') lines.push(...x.answers.map(a => fill(x.nl, a)));
    else lines.push(...(x.answers || []), ...(x.type === 'rewrite' ? [x.from] : []));
  }
  return [...new Set(lines.map(l => l.trim()).filter(l => l && !/[Ѐ-ӿ*]/.test(l)))];
}

async function check(text) {
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: 'nl', level: 'default' }),
  });
  if (res.status === 429) { await sleep(20000); return check(text); }
  if (!res.ok) throw new Error(`LanguageTool ${res.status}: ${await res.text()}`);
  return (await res.json()).matches || [];
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const report = {};
  let total = 0;
  for (const f of files) {
    const u = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (only && !only.includes(u.id)) continue;
    const lines = dutchStrings(u);
    const text = lines.join('\n');
    const matches = await check(text);
    // Strings are sent one per line; a match that spans a line break is the checker
    // reading two unrelated strings as one sentence, so it is dropped.
    const items = matches.map(m => {
      const lineNo = (text.slice(0, m.offset).match(/\n/g) || []).length;
      return { rule: m.rule.id, message: m.message, bad: text.slice(m.offset, m.offset + m.length), suggestions: m.replacements.slice(0, 3).map(r => r.value), line: lines[lineNo] };
    }).filter(it => !it.bad.includes('\n') && it.rule !== 'UPPERCASE_SENTENCE_START');
    report[u.id] = items;
    total += items.length;
    console.log(`${u.id}: ${lines.length} strings, ${items.length} matches`);
    for (const it of items) console.log(`    [${it.rule}] "${it.bad}" in "${it.line}" → ${it.suggestions.join(' / ') || '-'} · ${it.message}`);
    await sleep(3500);
  }
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\n${total} matches over ${Object.keys(report).length} units`);
}
