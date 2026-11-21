#!/usr/bin/env node
// Answer every card of the app with its own answer, in a real browser.
//   node tools/browser/check-cards.mjs            every unit, the verbs, de/het, then the review queue
//   node tools/browser/check-cards.mjs a2-03 b1-07   only these units
// A card that does not accept the answer it shows as correct is a fault in the
// card or in the data; so is any error the page throws. Exit code 1 when there are any.

import { withPage } from './harness.mjs';

const only = process.argv.slice(2);

// In the page: answer the cards of the round that is on screen, each with what the
// card itself calls correct, until the score card. Returns { n, bad: [...] }.
const RUN = `
  window.__runRound = function (limit = 400) {
    const out = { n: 0, bad: [] };
    for (let i = 0; i < limit; i++) {
      const s = document.querySelector('.screen.active');
      if (!s || s.querySelector('.ex-score-card') || !s.querySelector('#ceFeedback')) break;
      const c = window.__card;
      if (c.input.type === 'choice') s.querySelectorAll('.ce-option-btn')[c.input.options.findIndex(o => o.correct)].click();
      else { const inp = s.querySelector('#ceInput'); inp.value = c.correctText; inp.dispatchEvent(new Event('input')); s.querySelector('#ceCheck').click(); }
      const fb = s.querySelector('.ex-feedback-result');
      const retry = s.querySelector('#ceRetry');
      if (!fb || !fb.classList.contains('correct')) out.bad.push({ key: c.key, answer: c.correctText, got: fb ? fb.textContent : retry && !retry.hidden ? 'sent back: ' + retry.textContent : 'no verdict' });
      else if (!/Correct!/.test(fb.textContent) && c.input.type !== 'choice') out.bad.push({ key: c.key, answer: c.correctText, got: fb.textContent + ' (not exact)' });
      out.n++;
      const next = s.querySelector('.ce-next-btn');
      if (!next) break;
      next.click();
    }
    return out;
  };
  document.addEventListener('cardShown', e => { window.__card = e.detail.card; });
`;

const failures = [];
let cards = 0;
const note = (where, r) => { cards += r.n; for (const b of r.bad) failures.push({ where, ...b }); };

await withPage(async page => {
  await page.eval(RUN);
  const ids = await page.eval(`return (await import('./src/data/path/index.js')).UNITS.map(u => u.id)`);

  for (const id of ids.filter(i => !only.length || only.includes(i))) {
    const r = await page.eval(`openPathScreen('${id}'); document.getElementById('ptAll').click(); const r = window.__runRound(); document.querySelector('.screen.active #ceAgain, .screen.active #ceMenu')?.click(); return r;`);
    note(id, r);
    const done = await page.eval(`return (await import('./src/data/path-progress.js')).unitDone('${id}')`);
    if (!done) failures.push({ where: id, got: 'the unit is not marked done after a whole round' });
    // each grammar point once more from the Grammar screen
    note(id + ' (grammar)', await page.eval(`openGrammarScreen('${id}'); document.getElementById('grAll').click(); return window.__runRound();`));
    process.stdout.write('.');
  }

  if (!only.length) {
    // the irregular verbs: learn until nothing is new
    for (let i = 0; i < 80; i++) {
      const more = await page.eval(`openVerbsScreen(); const b = document.querySelector('#verbsScreen [data-learn]'); if (!b) return null; b.click(); return window.__runRound();`);
      if (!more) break;
      note('verbs', more);
    }
    // de/het: the same
    for (let i = 0; i < 80; i++) {
      const more = await page.eval(`openDeHetScreen(); const b = document.querySelector('#dhNew'); if (!b) return null; b.click(); return window.__runRound();`);
      if (!more) break;
      note('de/het', more);
    }
    // everything that was learned is due "tomorrow": move the clock and review it all
    await page.eval(`for (const k of ['dutch.pathProgress', 'dutch.verbProgress', 'dutch.dehetProgress']) { const d = JSON.parse(localStorage.getItem(k) || '{}'); for (const e of Object.values(d)) e.nextReview = 1; localStorage.setItem(k, JSON.stringify(d)); }`);
    await page.goto();
    await page.eval(RUN);
    const due = await page.eval(`return (await import('./src/review.js')).getDueTotal()`);
    console.log(`\n${due} items due after "a day"`);
    for (let i = 0; i < 400; i++) {
      const more = await page.eval(`openReviewScreen(); const b = document.querySelector('#reviewScreen .rv-all-btn:not([disabled])'); if (!b) return null; if (document.querySelector('.rv-catch-btn')) { /* a deep queue: no catch-up, take it all */ } startReviewAll(); return window.__runRound();`);
      if (!more || !more.n) break;
      note('review', more);
    }
    const left = await page.eval(`return (await import('./src/review.js')).getDueTotal()`);
    if (left) failures.push({ where: 'review', got: `${left} items still due after reviewing everything` });
  }
  for (const e of page.errors) failures.push({ where: 'page', got: e });
});

console.log(`\n${cards} cards answered`);
for (const f of failures) console.log(`FAIL ${f.where}${f.key ? ' · ' + f.key : ''}: ${f.got}${f.answer ? `  (answer given: ${f.answer})` : ''}`);
console.log(failures.length ? `${failures.length} problems` : 'every card accepts its own answer');
process.exit(failures.length ? 1 : 0);
