#!/usr/bin/env node
// Check course units (JSON, one unit per file) against the shape in tools/path/spec.md,
// inside a unit and across units.
//   node tools/path/validate.mjs --file tools/path/units/a2-01.json     one unit
//   node tools/path/validate.mjs tools/path/units [--syllabus tools/path/syllabus.json] [--json]
// Exit code 1 when a unit has errors. Warnings do not fail.

import fs from 'fs';
import path from 'path';

const POS = new Set(['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'num', 'expr']);
const TYPES = ['choose', 'gap', 'order', 'rewrite', 'fix'];
const isText = v => typeof v === 'string' && v.trim().length > 0;
const CYR = /[Ѐ-ӿ]/;

// Words of a sentence, for comparing an answer with the pieces it is built from.
export const tokens = s => String(s).toLowerCase().replace(/[’ʼ`´‘]/g, "'").replace(/[.,!?;:"]/g, ' ').split(/\s+/).filter(Boolean);
const sameBag = (a, b) => { const x = [...a].sort().join(' '), y = [...b].sort().join(' '); return x === y; };

// Word-level distance between two sentences (how many words differ).
function wordDistance(a, b) {
  const x = tokens(a), y = tokens(b);
  const dp = Array.from({ length: x.length + 1 }, (_, i) => Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[x.length][y.length];
}

function checkTypography(text, at, errs, warns) {
  if (/[’‘“”]/.test(text)) errs.push(`${at}: curly quote; use ' and "`);
  if (/\t/.test(text)) errs.push(`${at}: tab character`);
  if (/<\/?[a-z][^>]*>/i.test(text)) errs.push(`${at}: HTML tag`);
  if (text.split('\n').some(l => / {2,}/.test(l.trim()))) warns.push(`${at}: double space`);
  if (text.split('\n').some(l => /[ \t]$/.test(l))) warns.push(`${at}: a line ends with a space`);
}

function checkExplain(t, errs, warns) {
  if (!isText(t)) { errs.push('explain: missing'); return; }
  if (t.length < 1800) errs.push(`explain: too short (${t.length} characters, need 2,200–4,500)`);
  else if (t.length < 2200) warns.push(`explain: short (${t.length} characters; aim for 2,200–4,500)`);
  if (t.length > 5200) errs.push(`explain: too long (${t.length} characters, need 2,200–4,500)`);
  else if (t.length > 4500) warns.push(`explain: long (${t.length} characters; aim for 2,200–4,500)`);
  const lines = t.split('\n');
  const examples = lines.filter(l => /^> .+ — .+$/.test(l.trim()));
  if (examples.length < 6) errs.push(`explain: ${examples.length} example lines of the form "> Dutch — English" (need 6 or more)`);
  for (const l of lines) if (l.trim().startsWith('> ') && !/ — /.test(l)) errs.push(`explain: example line without " — ": ${l.trim().slice(0, 60)}`);
  if (!lines.some(l => /^### /.test(l.trim()))) errs.push('explain: no "### " section headings');
  for (const l of lines) if (/^#{1,2} |^#{4,} /.test(l.trim())) errs.push(`explain: only "### " headings are rendered: ${l.trim().slice(0, 40)}`);
  // Tables: a block of | lines, every line the same number of cells, 2 to 4 columns.
  let block = [];
  const closeBlock = () => {
    if (!block.length) return;
    const counts = block.map(l => l.trim().replace(/^\||\|$/g, '').split('|').length);
    if (block.length < 2) errs.push(`explain: a table needs a header line and at least one row: ${block[0].trim().slice(0, 50)}`);
    if (new Set(counts).size > 1) errs.push(`explain: table rows with different numbers of cells (${counts.join(', ')}): ${block[0].trim().slice(0, 50)}`);
    if (counts[0] < 2 || counts[0] > 4) errs.push(`explain: a table has ${counts[0]} columns (2 to 4)`);
    if (block.some(l => /^\|[\s:|-]+\|$/.test(l.trim()))) errs.push('explain: no |---| separator line in tables; the first line is the header');
    block = [];
  };
  for (const l of lines) {
    const x = l.trim();
    if (x.startsWith('|')) { if (!x.endsWith('|')) errs.push(`explain: table line must end with |: ${x.slice(0, 50)}`); block.push(l); }
    else closeBlock();
  }
  closeBlock();
  checkTypography(t, 'explain', errs, warns);
}

function checkWord(w, at, errs, warns) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) { errs.push(`${at}: must be an object { nl, en, pos, … }`); return; }
  if (!isText(w.nl)) errs.push(`${at}: nl missing`);
  if (!isText(w.en)) errs.push(`${at}: en missing`);
  if (!POS.has(w.pos)) errs.push(`${at}: pos "${w.pos}" is not one of ${[...POS].join(', ')}`);
  if (CYR.test(w.nl || '')) errs.push(`${at}: nl contains Cyrillic`);
  if (w.pos === 'n') {
    if (!['de', 'het', 'de/het'].includes(w.art)) errs.push(`${at}: noun "${w.nl}" needs art "de" or "het", got "${w.art}"`);
    if (/^(de|het|een) /i.test(w.nl || '')) errs.push(`${at}: "${w.nl}": the article goes in art, not in nl`);
    if (typeof w.pl !== 'string') errs.push(`${at}: noun "${w.nl}" needs pl (the plural, or "" if it has none)`);
    else if (/^(de|het) /i.test(w.pl)) errs.push(`${at}: pl "${w.pl}" without article`);
  }
  if (w.pos === 'v') {
    if (!isText(w.past)) errs.push(`${at}: verb "${w.nl}" needs past (ik-form of the simple past)`);
    if (!isText(w.perf)) errs.push(`${at}: verb "${w.nl}" needs perf (hij-form of the perfect with its auxiliary)`);
    else if (!/^(heeft|is|heeft\/is|is\/heeft) \S/.test(w.perf)) errs.push(`${at}: perf "${w.perf}" must start with "heeft ", "is " or "heeft/is "`);
    if (isText(w.en) && !/^to /.test(w.en)) warns.push(`${at}: en of a verb starts with "to": "${w.en}"`);
  }
  if ('tag' in w && !isText(w.tag)) errs.push(`${at}: empty tag`);
  for (const k of ['nl', 'en', 'pl', 'past', 'perf', 'tag']) if (typeof w[k] === 'string') checkTypography(w[k], `${at}.${k}`, errs, warns);
}

// Is a word of the list used somewhere in the unit's Dutch? A rough check on the
// first letters, which survives most endings; a separable verb is looked for by
// the part behind its prefix as well.
const PREFIXES = ['terug', 'samen', 'thuis', 'tegen', 'onder', 'voor', 'door', 'over', 'weg', 'mee', 'aan', 'uit', 'toe', 'bij', 'op', 'in', 'af', 'na', 'om'];
function usedIn(word, text) {
  const main = word.nl.toLowerCase().replace(/^zich /, '').split(' ').sort((a, b) => b.length - a.length)[0];
  const stems = [main];
  // The plural, the past and the participle count as well (taak is used when taken is).
  for (const f of [word.pl, word.past, word.perf]) if (isText(f)) stems.push(f.toLowerCase().split(/[ /]+/).sort((a, b) => b.length - a.length)[0].replace(/^ge/, ''));
  if (word.pos === 'v') for (const p of PREFIXES) if (main.startsWith(p) && main.length > p.length + 3) stems.push(main.slice(p.length));
  // The stem of a word with a long vowel changes its spelling (lopen → loop, bazen → baas).
  return stems.some(st => { const k = st.slice(0, Math.max(3, Math.min(5, st.length - 2))); return text.includes(k); });
}

function checkSentence(s, at, errs, warns, maxWords = 14) {
  if (!s || typeof s !== 'object') { errs.push(`${at}: must be an object`); return; }
  if (!isText(s.nl)) { errs.push(`${at}: nl missing`); return; }
  if (!/[.?!]$/.test(s.nl.trim())) errs.push(`${at}: nl must end with . ? or !`);
  if (CYR.test(s.nl)) errs.push(`${at}: nl contains Cyrillic`);
  if (!isText(s.en)) errs.push(`${at}: en missing`);
  if (!Array.isArray(s.hint) || s.hint.length < 2 || s.hint.length > 6 || !s.hint.every(isText)) errs.push(`${at}: hint must be 2 to 6 dictionary forms`);
  if (!isText(s.note) || s.note.trim().length < 20) errs.push(`${at}: note missing or too short`);
  if ('alt' in s && (!Array.isArray(s.alt) || !s.alt.length || !s.alt.every(isText))) errs.push(`${at}: alt must be a non-empty array of sentences`);
  if (Array.isArray(s.alt) && s.alt.some(a => tokens(a).join(' ') === tokens(s.nl).join(' '))) errs.push(`${at}: alt repeats nl`);
  const n = tokens(s.nl).length;
  if (n < 4) warns.push(`${at}: very short (${n} words)`);
  if (n > maxWords) warns.push(`${at}: long (${n} words; 5–${maxWords})`);
  for (const k of ['nl', 'en', 'note']) if (typeof s[k] === 'string') checkTypography(s[k], `${at}.${k}`, errs, warns);
}

function checkExercise(x, at, errs, warns) {
  if (!x || typeof x !== 'object') { errs.push(`${at}: must be an object`); return null; }
  if (!TYPES.includes(x.type)) { errs.push(`${at}: type "${x.type}" is not one of ${TYPES.join(', ')}`); return null; }
  if (!isText(x.en)) errs.push(`${at}: en missing`);
  if (!isText(x.note) || x.note.trim().length < 20) errs.push(`${at}: note missing or too short (say why this is the answer)`);
  const gaps = t => (String(t).match(/___/g) || []).length;
  const answersOk = () => {
    if (!Array.isArray(x.answers) || !x.answers.length || !x.answers.every(isText)) { errs.push(`${at}: answers must be a non-empty array of strings`); return false; }
    if (new Set(x.answers.map(a => tokens(a).join(' '))).size !== x.answers.length) errs.push(`${at}: answers repeat`);
    return true;
  };
  const sentenceEnd = a => /[.?!]$/.test(a.trim());
  let text = '';
  if (x.type === 'choose') {
    text = x.nl;
    if (!isText(x.nl) || gaps(x.nl) !== 1) errs.push(`${at}: nl must contain exactly one "___"`);
    if (!Array.isArray(x.options) || x.options.length < 3 || x.options.length > 4 || !x.options.every(isText)) errs.push(`${at}: choose needs 3 or 4 options`);
    else {
      if (new Set(x.options).size !== x.options.length) errs.push(`${at}: options repeat`);
      if (!Number.isInteger(x.correct) || x.correct < 0 || x.correct >= x.options.length) errs.push(`${at}: correct must be the index of the right option`);
    }
    if ('answers' in x) errs.push(`${at}: choose has options and correct, not answers`);
  } else if (x.type === 'gap') {
    text = x.nl;
    if (!isText(x.nl) || gaps(x.nl) !== 1) errs.push(`${at}: nl must contain exactly one "___"`);
    if (answersOk()) {
      if (x.answers.some(a => a.includes('___'))) errs.push(`${at}: an answer contains "___"`);
      if (x.answers.some(a => tokens(a).length > 4)) warns.push(`${at}: long gap answer; consider rewrite or order`);
    }
  } else if (x.type === 'order') {
    text = (x.answers && x.answers[0]) || '';
    if (!Array.isArray(x.words) || x.words.length < 3 || x.words.length > 10 || !x.words.every(isText)) errs.push(`${at}: order needs 3 to 10 pieces in words`);
    if ('lead' in x && !isText(x.lead)) errs.push(`${at}: empty lead`);
    if (answersOk() && Array.isArray(x.words) && x.words.every(isText)) {
      const bag = [...tokens(x.lead || ''), ...x.words.flatMap(tokens)];
      x.answers.forEach((a, i) => {
        if (!sentenceEnd(a)) errs.push(`${at}: answers[${i}] must end with . ? or !`);
        if (!sameBag(bag, tokens(a))) errs.push(`${at}: answers[${i}] is not made of exactly the pieces (lead + words): "${a}"`);
        if (x.lead && tokens(a).slice(0, tokens(x.lead).length).join(' ') !== tokens(x.lead).join(' ')) errs.push(`${at}: answers[${i}] does not start with the lead "${x.lead}"`);
      });
      if ((x.lead ? 1 : 0) + x.words.length < 4) warns.push(`${at}: only ${x.words.length + (x.lead ? 1 : 0)} pieces; hardly a puzzle`);
    }
  } else if (x.type === 'rewrite') {
    text = x.from;
    if (!isText(x.task) || x.task.trim().length < 8) errs.push(`${at}: task missing (the instruction, in English)`);
    if (!isText(x.from)) errs.push(`${at}: from missing (the Dutch sentence to change)`);
    if (answersOk()) {
      x.answers.forEach((a, i) => { if (!sentenceEnd(a)) errs.push(`${at}: answers[${i}] must end with . ? or !`); });
      if (isText(x.from) && x.answers.some(a => tokens(a).join(' ') === tokens(x.from).join(' '))) errs.push(`${at}: an answer is the same as from`);
    }
  } else if (x.type === 'fix') {
    text = x.wrong;
    if (!isText(x.wrong)) errs.push(`${at}: wrong missing (the sentence with one mistake)`);
    if (answersOk() && isText(x.wrong)) {
      x.answers.forEach((a, i) => { if (!sentenceEnd(a)) errs.push(`${at}: answers[${i}] must end with . ? or !`); });
      if (x.answers.some(a => tokens(a).join(' ') === tokens(x.wrong).join(' '))) errs.push(`${at}: an answer is the same as the wrong sentence`);
      const d = Math.min(...x.answers.map(a => wordDistance(a, x.wrong)));
      if (d > 3) warns.push(`${at}: the wrong sentence differs from the answer in ${d} words; it should have one mistake`);
    }
  }
  for (const k of ['nl', 'en', 'note', 'task', 'from', 'wrong', 'lead']) if (typeof x[k] === 'string') { checkTypography(x[k], `${at}.${k}`, errs, warns); if (k !== 'en' && k !== 'note' && k !== 'task' && CYR.test(x[k])) errs.push(`${at}.${k}: Cyrillic in Dutch text`); }
  for (const list of [x.options, x.answers, x.words]) if (Array.isArray(list)) list.forEach((v, i) => { if (typeof v === 'string') checkTypography(v, `${at}[${i}]`, errs, warns); });
  return text;
}

export function validateUnit(u) {
  const errs = [], warns = [];
  if (!u || typeof u !== 'object') return { errs: ['not an object'], warns };
  if (!/^(a2|b1|b2)-\d{2}$/.test(u.id || '')) errs.push(`id: "${u.id}" must look like a2-04`);
  else if (u.level !== u.id.slice(0, 2).toUpperCase()) errs.push(`level: "${u.level}" does not match id ${u.id}`);
  if (!isText(u.icon)) errs.push('icon: missing');
  for (const k of ['title', 'grammar']) { if (!isText(u[k])) errs.push(`${k}: missing`); else if (u[k].length > 70) errs.push(`${k}: too long (${u[k].length} characters)`); }
  if (!isText(u.summary)) errs.push('summary: missing (the rule in one or two sentences)');
  else { if (u.summary.length < 40 || u.summary.length > 240) errs.push(`summary: ${u.summary.length} characters (need 40–240)`); checkTypography(u.summary, 'summary', errs, warns); }
  checkExplain(u.explain, errs, warns);

  if (!Array.isArray(u.words)) errs.push('words: missing array');
  else {
    // A writer delivers 14–16; dedupe.mjs may take a repeated word out afterwards, down to 12.
    if (u.words.length < 12 || u.words.length > 16) errs.push(`words: ${u.words.length} (need 14–16)`);
    else if (u.words.length < 14) warns.push(`words: ${u.words.length} (14–16 when written; fewer only after dedupe)`);
    const seen = new Set();
    u.words.forEach((w, i) => {
      checkWord(w, `words[${i}]`, errs, warns);
      if (w && seen.has(w.nl)) errs.push(`words[${i}]: "${w.nl}" is listed twice`);
      if (w) seen.add(w.nl);
    });
  }

  if (!Array.isArray(u.sentences)) errs.push('sentences: missing array');
  else {
    if (u.sentences.length !== 10) errs.push(`sentences: ${u.sentences.length} (need 10)`);
    const seen = new Set();
    u.sentences.forEach((s, i) => {
      checkSentence(s, `sentences[${i}]`, errs, warns, { A2: 14, B1: 18, B2: 22 }[u.level] || 14);
      if (s?.nl && seen.has(s.nl)) errs.push(`sentences[${i}]: repeated`);
      if (s?.nl) seen.add(s.nl);
    });
  }

  const dutch = [];
  if (!Array.isArray(u.exercises)) errs.push('exercises: missing array');
  else {
    if (u.exercises.length < 14 || u.exercises.length > 16) errs.push(`exercises: ${u.exercises.length} (need 14–16)`);
    const seen = new Set();
    u.exercises.forEach((x, i) => {
      const text = checkExercise(x, `exercises[${i}]`, errs, warns);
      if (text) { const k = `${x.type}:${text}`; if (seen.has(k)) errs.push(`exercises[${i}]: the same exercise twice`); seen.add(k); }
      if (x && typeof x === 'object') dutch.push(x.nl, x.from, x.wrong, x.lead, ...(x.answers || []), ...(x.options || []), ...(x.words || []));
    });
    const n = t => u.exercises.filter(x => x?.type === t).length;
    if (n('choose') < 3) errs.push(`exercises: ${n('choose')} choose (need 3 or more)`);
    if (n('gap') < 3) errs.push(`exercises: ${n('gap')} gap (need 3 or more)`);
    if (n('fix') < 1) errs.push('exercises: no fix exercise');
    if (TYPES.filter(t => n(t) > 0).length < 4) errs.push(`exercises: only ${TYPES.filter(t => n(t) > 0).join(', ')}; use at least four of the five kinds`);
  }

  // Every word is practised somewhere in the unit.
  if (Array.isArray(u.words) && Array.isArray(u.sentences)) {
    const text = [...u.sentences.flatMap(s => [s?.nl, ...(s?.alt || [])]), ...dutch].filter(isText).join(' ').toLowerCase();
    const unused = u.words.filter(w => w && isText(w.nl) && !usedIn(w, text)).map(w => w.nl);
    if (unused.length) warns.push(`words not found in any sentence or exercise: ${unused.join(', ')}`);
  }
  return { errs, warns };
}

export function validateDir(dir, syllabus = null) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const report = { units: {}, cross: [], notes: [], ok: true };
  const units = [];
  for (const f of files) {
    let u;
    try { u = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { report.units[f] = { errs: [`invalid JSON: ${e.message}`], warns: [] }; report.ok = false; continue; }
    const r = validateUnit(u);
    report.units[f] = r;
    if (u.id && f !== `${u.id}.json`) r.errs.push(`file name ${f} does not match id ${u.id}`);
    if (syllabus) {
      const s = syllabus.units.find(x => x.id === u.id);
      if (s) for (const k of ['level', 'icon', 'title', 'grammar']) if (s[k] !== u[k]) r.errs.push(`${k}: "${u[k]}" differs from the syllabus ("${s[k]}")`);
    }
    if (r.errs.length) report.ok = false;
    units.push(u);
  }
  const order = syllabus ? syllabus.units.map(s => s.id) : null;
  if (order) units.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const ids = new Set(), words = new Map(), sents = new Map();
  for (const u of units) {
    if (ids.has(u.id)) report.cross.push(`duplicate unit id ${u.id}`);
    ids.add(u.id);
    for (const w of u.words || []) {
      if (!w?.nl) continue;
      const k = `${w.nl}|${w.pos}`;
      if (words.has(k)) report.notes.push(`word "${w.nl}" is in ${words.get(k)} and ${u.id}`);
      else words.set(k, u.id);
    }
    for (const s of u.sentences || []) {
      if (s?.nl && sents.has(s.nl)) report.cross.push(`sentence "${s.nl}" is in ${sents.get(s.nl)} and ${u.id}`);
      else if (s?.nl) sents.set(s.nl, u.id);
    }
  }
  if (syllabus) {
    const missing = order.filter(id => !ids.has(id));
    const extra = [...ids].filter(id => !order.includes(id));
    if (missing.length) report.notes.push(`not written yet: ${missing.join(', ')}`);
    if (extra.length) report.cross.push(`units not in the syllabus: ${extra.join(', ')}`);
  }
  report.words = words.size;
  if (report.cross.length) report.ok = false;
  return report;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const filePath = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
  const sylPath = args.includes('--syllabus') ? args[args.indexOf('--syllabus') + 1] : null;
  const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--file' && args[i - 1] !== '--syllabus');
  if (!dir && !filePath) { console.error('usage: validate.mjs <dir> [--syllabus file] [--json]  |  validate.mjs --file unit.json'); process.exit(2); }
  if (filePath) {
    let r;
    try { r = validateUnit(JSON.parse(fs.readFileSync(filePath, 'utf8'))); }
    catch (e) { r = { errs: [`invalid JSON: ${e.message}`], warns: [] }; }
    r.errs.forEach(e => console.log(`ERROR ${e}`));
    r.warns.forEach(w => console.log(`warn  ${w}`));
    console.log(r.errs.length ? `FAIL (${r.errs.length} errors)` : 'OK');
    process.exit(r.errs.length ? 1 : 0);
  }
  const syllabus = sylPath ? JSON.parse(fs.readFileSync(sylPath, 'utf8')) : null;
  const report = validateDir(dir, syllabus);
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    for (const [f, r] of Object.entries(report.units)) {
      if (r.errs.length || r.warns.length) console.log(`\n${f}`);
      r.errs.forEach(e => console.log(`  ERROR ${e}`));
      r.warns.forEach(w => console.log(`  warn  ${w}`));
    }
    report.cross.forEach(c => console.log(`CROSS ${c}`));
    report.notes.forEach(c => console.log(`note  ${c}`));
    const n = Object.keys(report.units).length, bad = Object.values(report.units).filter(r => r.errs.length).length;
    console.log(`\n${n} units, ${bad} with errors, ${report.cross.length} cross-unit problems, ${report.words} distinct words → ${report.ok ? 'OK' : 'FAIL'}`);
  }
  process.exit(report.ok ? 0 : 1);
}
