#!/usr/bin/env node
// Check every article, plural and verb form the app teaches against the official
// word list (Woordenlijst Nederlandse Taal, woordenlijst.org): the word lists of
// all units, the irregular verbs and the de/het nouns.
//   node tools/check-forms.mjs [--refresh] [--notes]
// It reports what does not agree with the official list. That is a list for a
// person to judge, not a verdict: the official list has two entries for some
// spellings (de stof and het stof), and does not know every compound.
// Answers are kept in a file in the temp folder, so a second run asks nothing again
// (--refresh asks everything again). --notes also prints the remarks that are no errors.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { NOUNS } from '../src/data/nouns.js';
import { VERBS } from '../src/data/strong-verbs.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CACHE = path.join(os.tmpdir(), 'dutch-app-woordenlijst.json');
const refresh = process.argv.includes('--refresh'), showNotes = process.argv.includes('--notes');
const cache = !refresh && fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchXml(word) {
  if (word in cache) return cache[word];
  const url = `https://woordenlijst.org/MolexServe/lexicon/find_wordform?database=gig_pro_wrdlst&wordform=${encodeURIComponent(word)}&paradigm=true&diminutive=false&onlyvalid=true&regex=false`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) { cache[word] = await res.text(); return cache[word]; }
    } catch { /* try again */ }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`no answer for "${word}"`);
}

const tag = (s, t) => (s.match(new RegExp(`<${t}>([^<]*)</${t}>`)) || [])[1] || '';
// Every entry of the official list that has this spelling among its forms.
async function lookup(word) {
  const xml = await fetchXml(word);
  return xml.split('<found_lemmata>').slice(1).map(l => {
    const head = l.split('<paradigm>')[0];
    const forms = [...l.matchAll(/<paradigm><arch>([^<]*)<\/arch><group_label>([^<]*)<\/group_label>.*?<label>([^<]*)<\/label><part_of_speech>[^<]*<\/part_of_speech>.*?<wordform>([^<]*)<\/wordform>/g)]
      .map(m => ({ arch: m[1] === 'true', group: m[2], label: m[3], form: m[4] }));
    return { lemma: tag(head, 'lemma'), pos: tag(head, 'lemma_part_of_speech'), features: tag(head, 'verb_features'), forms };
  });
}

// ── What the official list says ──────────────────────────────────────────────

async function nounFacts(word) {
  const arts = new Set(), plurals = new Set();
  for (const l of await lookup(word)) {
    if (!l.pos.startsWith('NOU')) continue;
    const isLemma = l.lemma === word, asPlural = l.forms.some(f => f.label === 'meervoud' && f.form === word);
    if (!isLemma && !asPlural) continue;
    if (!isLemma) { arts.add('de'); continue; }           // a word that is a plural itself (kosten, ouders)
    const g = (l.pos.match(/gender=([^,)]+)/) || [])[1] || '';
    if (/n/.test(g)) arts.add('het');
    if (/[mf]/.test(g)) arts.add('de');
    if (/number=pl/.test(l.pos)) arts.add('de');
    for (const f of l.forms) if (f.label === 'meervoud' && !f.arch) plurals.add(f.form);
  }
  return { arts, plurals };
}

async function verbFacts(inf) {
  const aux = new Set(), past = new Set(), pastPl = new Set(), part = new Set();
  let found = false;
  for (const l of await lookup(inf)) {
    if (!l.pos.startsWith('VRB') || l.lemma !== inf) continue;
    found = true;
    const a = l.features.split(';')[0];
    if (/hebben/.test(a)) aux.add('h');
    if (/zijn/.test(a)) aux.add('z');
    for (const f of l.forms) {
      if (f.arch) continue;
      if (f.group === 'verleden tijd' && f.label === 'ik') past.add(f.form);
      if (f.group === 'verleden tijd' && f.label === 'wij') pastPl.add(f.form);
      if (f.group === 'voltooid deelwoord') part.add(f.form);
    }
  }
  return { found, aux, past, pastPl, part };
}

// ── What the app says ────────────────────────────────────────────────────────

const errors = [], notes = [];
// Looked at and right, with the reason; they are reported as remarks, not as errors.
const KNOWN = {
  'zich zorgen maken': 'the list is read for the verb zorgen; maakte me zorgen, heeft zich zorgen gemaakt are right',
  'het uitmaken': 'maakte het uit is the split form of maakte uit',
  hardlopen: 'zijn with a destination (ANS: verbs of movement); the list names only hebben, for the activity',
  schaatsen: 'zijn with a destination (ANS: verbs of movement); the list names only hebben, for the activity',
  varen: 'zijn with a destination (ANS: verbs of movement); the list names only hebben, for the activity',
};
const say = (list, where, text) => {
  const known = Object.keys(KNOWN).find(k => list === errors && text.includes(` of ${k}:`));
  if (known) notes.push(`${where}: ${text} (known: ${KNOWN[known]})`);
  else list.push(`${where}: ${text}`);
};
const has = (set, v) => set.has(v);
const PRON = new Set(['me', 'mij', 'zich', 'je']);
const words = s => String(s).toLowerCase().split(/\s+/).filter(w => w && !PRON.has(w));
// Is one of the official forms in what the app gives (as whole words, in order)?
const contains = (ours, official) => { const o = words(ours).join(' '); return [...official].some(f => (` ${o} `).includes(` ${f} `)); };
const alts = s => String(s).split(' / ').map(x => x.trim()).filter(Boolean);

async function checkNoun(where, nl, art, pl) {
  if (/\s/.test(nl)) return;
  const f = await nounFacts(nl);
  if (!f.arts.size) { say(notes, where, `"${nl}" is not in the official list as a noun (a compound, perhaps): ${art} ${nl} not checked`); return; }
  const ours = String(art).split('/');
  const wrong = ours.filter(a => !has(f.arts, a));
  if (wrong.length) say(errors, where, `ARTICLE ${art} ${nl}: the official list has ${[...f.arts].join(' and ')}`);
  else if (f.arts.size > ours.length) say(notes, where, `${nl}: the official list has both de and het (another meaning, or both allowed); the app teaches ${art}`);
  if (pl) {
    const bad = alts(pl).map(p => p.replace(/^\(|\)$/g, '')).filter(p => f.plurals.size && !has(f.plurals, p));
    if (bad.length) say(errors, where, `PLURAL of ${nl}: "${bad.join(', ')}" is not in the official list (it has ${[...f.plurals].join(', ') || 'no plural'})`);
    else if (f.plurals.size > alts(pl).length) say(notes, where, `${nl}: the official list also has the plural ${[...f.plurals].filter(p => !alts(pl).includes(p)).join(', ')}`);
  }
}

// perf: "heeft gewerkt", "is gegaan", "heeft/is gereden"
async function checkVerb(where, nl, past, perf, pastPl = null) {
  const tokens = nl.toLowerCase().split(/\s+/).filter(t => t !== 'zich');
  let inf = null, f = null;
  for (const t of tokens) { const x = await verbFacts(t); if (x.found) { inf = t; f = x; break; } }
  if (!f) { say(notes, where, `"${nl}" is not in the official list as a verb: not checked`); return; }
  if (past) for (const p of alts(past)) if (f.past.size && !contains(p, f.past)) say(errors, where, `PAST of ${nl}: "${p}" (the official list has ${[...f.past].join(', ')})`);
  if (pastPl) for (const p of alts(pastPl)) if (f.pastPl.size && !contains(p, f.pastPl)) say(errors, where, `PAST PLURAL of ${nl}: "${p}" (the official list has ${[...f.pastPl].join(', ')})`);
  if (perf) {
    const m = perf.match(/^(heeft\/is|is\/heeft|heeft|is)\s+(.+)$/);
    if (!m) { say(errors, where, `PERFECT of ${nl}: "${perf}" has no auxiliary`); return; }
    if (f.part.size && !contains(m[2], f.part)) say(errors, where, `PARTICIPLE of ${nl}: "${m[2]}" (the official list has ${[...f.part].join(', ')})`);
    const ours = new Set(m[1].includes('/') ? ['h', 'z'] : m[1] === 'is' ? ['z'] : ['h']);
    const name = s => [...s].map(x => (x === 'h' ? 'hebben' : 'zijn')).join(' and ');
    const missing = [...ours].filter(a => !has(f.aux, a));
    if (f.aux.size && missing.length) say(errors, where, `AUXILIARY of ${nl}: the app has "${m[1]}", the official list has ${name(f.aux)}`);
    else if (f.aux.size > ours.size) say(notes, where, `${nl}: the official list has both hebben and zijn; the app teaches "${m[1]}"`);
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

const jobs = [];
const unitDir = path.join(root, 'tools/path/units');
for (const file of fs.readdirSync(unitDir).filter(x => x.endsWith('.json')).sort()) {
  const u = JSON.parse(fs.readFileSync(path.join(unitDir, file), 'utf8'));
  for (const w of u.words) {
    if (w.pos === 'n') jobs.push(() => checkNoun(u.id, w.nl, w.art, w.pl));
    if (w.pos === 'v') jobs.push(() => checkVerb(u.id, w.nl, w.past, w.perf));
  }
}
for (const n of NOUNS) jobs.push(() => checkNoun('de/het list', n.nl, n.art, ''));
const AUX = { h: 'heeft', z: 'is', hz: 'heeft/is' };
for (const v of VERBS) jobs.push(() => checkVerb('irregular verbs', v.inf, v.past, v.part ? `${AUX[v.aux]} ${v.part}` : '', v.pastPl));

// A few at a time: quick enough, and gentle on the service.
let next = 0, done = 0;
async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++];
    try { await job(); } catch (e) { say(notes, 'lookup', e.message); }
    if (++done % 100 === 0) { process.stderr.write(`${done}/${jobs.length}\r`); fs.writeFileSync(CACHE, JSON.stringify(cache)); }
    await sleep(40);
  }
}
await Promise.all([worker(), worker(), worker()]);
fs.writeFileSync(CACHE, JSON.stringify(cache));

console.log(`${jobs.length} words checked against woordenlijst.org`);
for (const e of errors.sort()) console.log('  ' + e);
console.log(errors.length ? `${errors.length} to look at` : 'everything agrees with the official list');
if (showNotes) { console.log(`\n${notes.length} remarks:`); for (const n of notes.sort()) console.log('  ' + n); }
else console.log(`(${notes.length} remarks that are no errors; --notes shows them)`);
process.exit(errors.length ? 1 : 0);
