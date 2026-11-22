// ── Course engine ─────────────────────────────────────────────────────────────
// One way of learning for every subject:
//   1. learn   a new item is shown with its answer (hear it, copy it)
//   2. test    the same item from memory, typed
//   3. review  it comes back on a schedule, in one queue with everything else
//   4. apply   free practice (the grammar exercises)
//
// A course supplies its items, its menu and its cards. The engine owns the rest:
// running a session, checking an answer, the second try after a near miss,
// feedback, "my answer was right too", the score card and the missed list.
// Because every course hands over the same kind of card, cards of different
// courses can sit in one session: that is the single Review queue.
// The schedule behind it lives in data/course-progress.js.

import { escHtml } from '../utils.js';
import { speakText } from '../voice.js';
import { shuffle, clean, resultLine, diffHtml, appendNext, missedListHtml, wireSpeakButtons, scoreMessage, scoreEmoji } from './drill-core.js';

// ── Sessions ─────────────────────────────────────────────────────────────────
// A card:
//   key          item id
//   course       { icon, name } shown as a chip when cards of several courses are mixed
//   intro        first exposure: the answer is on the card, nothing is recorded
//   promptHtml   the question block
//   autoSay      text spoken when the card appears
//   input        { type: 'text', placeholder, long?, value?, tap? }
//                  long = a whole sentence (left-aligned, smaller text) · value = text already in it
//                  tap = answered by tapping pieces: on a phone the keyboard stays down
//                | { type: 'choice', options: [{ label, correct, key? }], layout? }
//                  key = a letter that picks the option · layout 'pair' = two big buttons
//   check(a)     → { isExact, isClose, isCorrect, quality, headline?, correct?, noOverride? }
//                  noOverride = a miss that cannot be "right too" (the wrong article)
//                  or { retry, keep? }: a note; the answer is not counted and the learner
//                  tries again (keep leaves what she typed in the field)
//   record(res)  stores the result, returns a token for override
//   override(t)  optional: undo a miss ("my answer was right too")
//   correctText  the right answer, as text (res.correct, when given, is shown instead)
//   diff         mark the words that differ in "your answer" and "correct"
//   detailHtml   shown under the verdict: the item itself, the rule. A string, or
//                ({ res, answer }) => string when it depends on the answer
//   afterFeedback(root, res)  optional: wire up what detailHtml put there
//   say          text behind the Listen button; with sayAfter it is also played once answered
//   missed       { left, right, extra, say } row for the end-of-round list
//   mount({ root, input, submit })  optional, called once the card is on screen: for a
//                card with controls of its own (the pieces of a word-order exercise)

const DEFAULT_ACCENT = { main: '#c2410c', dark: '#9a3412', soft: '#fff7ed', border: '#fdba74' };
// A phone or tablet: no hover, a finger for a pointer.
const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// ── Warm-up ──────────────────────────────────────────────────────────────────
// A session that teaches something new starts with a few items that are due,
// from every course: old material is kept alive inside what the learner wanted
// to do anyway, without ever locking the new. review.js registers the source.
let dueSource = null;
export function registerDueSource(src) { dueSource = src; }   // { cards(): card[], count(): number }
export const dueCount = () => (dueSource ? dueSource.count() : 0);

function warmUpCards(n, own, source) {
  const src = source || (dueSource && dueSource.cards);
  if (!src || n <= 0) return [];
  const taken = new Set(own.map(c => c.key));
  const due = src().filter(c => !taken.has(c.key));
  // A course's own source hands over its cards in its own order (due first).
  return (source ? due : shuffle(due)).slice(0, n).map(c => ({ ...c, warmup: true }));
}

// warmUp: how many due items open the session; warmUpSource: where they come from
// (a course's own due cards), default every course.
// resume: { at, score, missed } picks a round up where it was left: it starts at
// own card number `at` (the warm-up is skipped) with the score so far.
// onProgress({ at, score, missed }) reports after every answered card of the
// round itself, so the caller can keep that position.
export function runSession({ screen, icon, title, accent = DEFAULT_ACCENT, cards, mixed = false, warmUp = 0, warmUpSource = null, resume = null, onProgress = null, onExit, again, scoreSubtitle }) {
  const s = screen;
  const startAt = resume ? Math.max(0, Math.min(resume.at || 0, cards.length - 1)) : 0;
  const warm = startAt ? [] : warmUpCards(warmUp, cards, warmUpSource);
  if (warm.length) cards = [...warm, ...cards];
  const run = { current: startAt, score: resume?.score || 0, answered: false, missed: [...(resume?.missed || [])], keyHandler: null };
  // How far the round itself is, for the caller to remember.
  const report = () => { const at = run.current + 1 - warm.length; if (onProgress && at > 0) onProgress({ at, score: run.score, missed: run.missed }); };
  s.style.setProperty('--ce-main', accent.main);
  s.style.setProperty('--ce-dark', accent.dark);
  s.style.setProperty('--ce-soft', accent.soft);
  s.style.setProperty('--ce-border', accent.border);

  const header = (titleText, sub) => `
    <div class="lesson-header ce-header">
      <button class="back-btn" id="ceBack" type="button" aria-label="Back">←</button>
      <div class="ce-header-text">
        <div class="lesson-title">${icon} ${escHtml(titleText)}</div>
        <div class="lesson-subtitle">${sub}</div>
      </div>
    </div>`;

  const exit = () => { detachKeys(); onExit(); };
  const detachKeys = () => { if (run.keyHandler) { s.removeEventListener('keydown', run.keyHandler); run.keyHandler = null; } };

  function renderCard() {
    run.answered = false;
    detachKeys();
    const card = cards[run.current];
    const inWarm = !!card.warmup, own = cards.length - warm.length;
    const pos = inWarm ? run.current : run.current - warm.length, total = inWarm ? warm.length : own;
    const pct = Math.round((pos / total) * 100);
    const isChoice = card.input.type === 'choice';
    // Every answer field is a textarea, one line high and growing with the text:
    // Safari on an iPhone offers to fill in contact details (the AutoFill bar above
    // the keyboard, with the owner's name) in a text input, not in a textarea.
    // enterkeyhint names the Return key: it checks the answer.
    const attrs = `id="ceInput" lang="nl" rows="1" enterkeyhint="go" placeholder="${escHtml(card.input.placeholder || '')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`;

    s.innerHTML = `
      ${header(title, `<div class="ce-progress-wrap"><div class="ce-progress-bar" style="width:${pct}%"></div></div>
                       <div class="ce-progress-text">${inWarm ? 'Warm-up · ' : ''}${pos + 1} / ${total}</div>`)}
      ${inWarm ? `<div class="ce-warmup-banner">
          <span class="ce-warmup-title">🔁 Warm-up ${pos + 1}/${warm.length}: ${card.practice ? 'extra practice, not due yet' : 'something you learned before'}${card.course ? ` · ${card.course.icon} ${escHtml(card.course.name)}` : ''}</span>
          <span class="ce-warmup-sub">Then the new material (${own} cards). <button class="ce-warmup-skip" id="ceSkipWarm" type="button">Skip warm-up →</button></span>
        </div>`
        : mixed && card.course ? `<div class="ce-course-chip">${card.course.icon} ${escHtml(card.course.name)}</div>` : ''}
      ${card.promptHtml}
      ${isChoice ? `
        <div class="ce-options ${card.input.layout === 'pair' ? 'ce-options-pair' : ''}">
          ${card.input.options.map((o, i) => `<button class="ce-option-btn" type="button" data-idx="${i}">${escHtml(o.label)}</button>`).join('')}
        </div>` : `
        <div class="ce-input-area ${card.input.long ? 'ce-input-long' : ''}">
          <textarea class="ce-text-input" ${attrs}></textarea>
          <button class="ce-check-btn" id="ceCheck" type="button">Check ✓</button>
        </div>
        <div class="ce-retry-note" id="ceRetry" hidden></div>`}
      <div id="ceFeedback"></div>`;

    // A new card starts at the top of the page, before its field takes the focus.
    window.scrollTo({ top: 0 });
    s.querySelector('#ceBack').addEventListener('click', exit);
    s.querySelector('#ceSkipWarm')?.addEventListener('click', () => { run.current = warm.length; renderCard(); });
    wireSpeakButtons(s);
    if (card.autoSay) setTimeout(() => speakText(card.autoSay), card.intro ? 200 : 0);

    if (isChoice) wireChoice(card); else wireText(card);
    // For whoever wants to know which card is on screen (the checks in tools/ answer every card with its own answer).
    document.dispatchEvent(new CustomEvent('cardShown', { detail: { card } }));
  }

  function wireText(card) {
    const input = s.querySelector('#ceInput');
    const check = s.querySelector('#ceCheck');
    // The field grows with what is typed in it.
    const fit = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
    if (card.input.value) input.value = card.input.value;
    const submit = () => {
      if (run.answered) return;
      const answer = input.value.replace(/\s+/g, ' ').trim();
      if (!answer) { input.focus(); return; }
      const note = s.querySelector('#ceRetry');
      const res = card.check(answer);
      if (res.retry) {
        note.textContent = res.retry; note.hidden = false;
        if (!res.keep) input.value = card.input.value || '';
        fit();
        input.focus();
        input.dispatchEvent(new Event('input'));
        return;
      }
      note.hidden = true;
      run.answered = true;
      input.disabled = true; check.disabled = true;
      input.classList.add(res.isExact ? 'correct' : res.isCorrect ? 'close' : 'wrong');
      settle(card, res, answer, { compare: !res.isExact });
    };
    check.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    input.addEventListener('input', fit);
    fit();
    // On a phone the keyboard comes up with the focus. A card that is answered by
    // tapping (the pieces of a word-order exercise) leaves it down until asked for.
    if (!(card.input.tap && isTouch())) input.focus();
    if (card.mount) card.mount({ root: s, input, submit });
  }

  function wireChoice(card) {
    const buttons = [...s.querySelectorAll('.ce-option-btn')];
    const pick = btn => {
      if (run.answered) return;
      run.answered = true;
      const opt = card.input.options[Number(btn.dataset.idx)];
      const ok = !!opt.correct;
      buttons.forEach((b, i) => {
        b.disabled = true;
        if (card.input.options[i].correct) b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
      });
      // Choosing is the easier way of being right: quality 4, not 5.
      settle(card, { isExact: ok, isClose: false, isCorrect: ok, quality: ok ? 4 : 1 }, opt.label, { compare: false });
    };
    buttons.forEach(btn => btn.addEventListener('click', () => pick(btn)));
    // Keys 1–9 pick an option (and an option's own letter does), so a whole round
    // can be done from the keyboard.
    run.keyHandler = e => {
      if (run.answered || e.metaKey || e.ctrlKey || e.altKey) return;
      const byKey = card.input.options.findIndex(o => o.key && o.key === e.key.toLowerCase());
      const btn = byKey !== -1 ? buttons[byKey] : /^[1-9]$/.test(e.key) ? buttons[Number(e.key) - 1] : null;
      if (btn) { e.preventDefault(); pick(btn); }
    };
    s.addEventListener('keydown', run.keyHandler);
    buttons[0].focus({ preventScroll: true });
  }

  // Verdict, record, feedback, Next.
  function settle(card, res, answer, { compare }) {
    if (res.isCorrect) run.score++;
    // Introduction cards are copying, so they never count as a failure.
    let token = null;
    if (!card.intro) {
      token = card.record(res);
      if (!res.isCorrect) run.missed.push(card.missed);
    }

    s.querySelectorAll('.ce-pieces').forEach(el => el.classList.add('ce-pieces-done'));
    const fb = s.querySelector('#ceFeedback');
    const correctText = res.correct || card.correctText;
    let html = resultLine(res);
    // The two lines are only worth showing when they differ (an answer that was put right at the second try does not).
    if (compare && correctText && clean(answer) !== clean(correctText)) {
      const d = card.diff ? diffHtml(answer, correctText) : { yours: escHtml(answer), right: escHtml(correctText) };
      html += `<div class="ce-compare">
        <div class="ce-your-answer"><b>Your answer:</b> ${d.yours}</div>
        <div class="ce-correct-answer"><b>Correct:</b> ${d.right}</div>
      </div>`;
    }
    // A typed answer can be right without being on the list (another word order, a synonym).
    const canOverride = !card.intro && !res.isCorrect && card.override && !res.noOverride;
    if (canOverride) html += `<button class="ce-override-btn" id="ceOverride" type="button">✓ My answer was right too</button>`;
    html += (typeof card.detailHtml === 'function' ? card.detailHtml({ res, answer }) : card.detailHtml) || '';
    if (card.say) html += `<button class="ce-listen-btn" id="ceListen" type="button">🔊 Listen</button>`;
    fb.innerHTML = html;
    wireSpeakButtons(fb);
    fb.querySelector('#ceListen')?.addEventListener('click', () => speakText(card.say));
    if (card.sayAfter && card.say) setTimeout(() => speakText(card.say), 400);
    if (card.afterFeedback) card.afterFeedback(fb, res);

    report();

    if (canOverride) {
      const btn = fb.querySelector('#ceOverride');
      btn.addEventListener('click', () => {
        card.override(token);
        run.score++;
        run.missed.pop();
        report();
        fb.querySelector('.ex-feedback-result').outerHTML = `<div class="ex-feedback-result correct">✓ Counted as correct</div>`;
        btn.remove();
        const input = s.querySelector('#ceInput');
        if (input) { input.classList.remove('wrong'); input.classList.add('close'); }
        fb.querySelector('.ce-next-btn')?.focus({ preventScroll: true });
      });
    }

    const isLast = run.current + 1 >= cards.length;
    appendNext(fb, { isLast, className: 'ce-next-btn', onNext: () => {
      if (isLast) showScore();
      else { run.current++; renderCard(); }
    } });
  }

  function showScore() {
    detachKeys();
    const total = cards.length;
    const pct = Math.round((run.score / total) * 100);
    const more = again ? again() : null; // { label, run } — asked now, progress has moved on
    s.innerHTML = `
      ${header('Results', escHtml(scoreSubtitle ? scoreSubtitle() : title))}
      <div class="ex-score-card">
        <div class="ex-score-emoji">${scoreEmoji(pct)}</div>
        <div class="ex-score-title">${escHtml(scoreMessage(pct))}</div>
        <div class="ex-score-fraction">${run.score} / ${total}</div>
        <div class="ex-score-bar-wrap"><div class="ex-score-bar-fill" style="width: ${pct}%"></div></div>
        <div class="ex-score-pct">${pct}%</div>
        <div class="ex-score-actions">
          ${more ? `<button class="ex-next-btn" id="ceAgain" type="button">${escHtml(more.label)}</button>` : ''}
          <button class="ex-back-btn" id="ceMenu" type="button">← Back</button>
        </div>
      </div>
      ${missedListHtml(run.missed)}`;
    wireSpeakButtons(s);
    s.querySelector('#ceBack').addEventListener('click', exit);
    s.querySelector('#ceMenu').addEventListener('click', exit);
    if (more) s.querySelector('#ceAgain').addEventListener('click', more.run);
    s.scrollTo({ top: 0 });
  }

  if (!cards.length) { onExit(); return; }
  renderCard();
}
