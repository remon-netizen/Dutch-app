// ── Shared pieces of every card ──────────────────────────────────────────────
// Comparing a typed answer with the right one, the verdict line, the Next button,
// the score texts and the list of what was missed. They live here so that every
// course behaves the same way and a fix lands everywhere at once.

import { escHtml, levenshtein } from '../utils.js';
import { speakText } from '../voice.js';

export { shuffle } from '../utils.js';

// ── Comparing ────────────────────────────────────────────────────────────────

// Capitals, spacing and the kind of apostrophe do not matter.
export const normalise = s => String(s).toLowerCase().replace(/[’ʼ`´‘]/g, "'").replace(/\s+/g, ' ').trim();
// A sentence without its punctuation: what was typed is judged on its words.
// The stressed and the unstressed form of a subject pronoun are the same answer
// where they cannot be anything else: wij / we anywhere, zij / ze as the first word.
// (jij / je is not on the list: je is also "you" as an object and "your".)
export const clean = s => normalise(s).replace(/[.,!?;:"()«»…]/g, ' ').replace(/\s[-–—]+\s/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/\bwij\b/g, 'we').replace(/^zij\b/, 'ze')
  // hoelang and hoe lang are both right for a length of time
  .replace(/\bhoelang\b/g, 'hoe lang');
// Without accents and trema: één → een, geïnteresseerd → geinteresseerd.
export const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// How a typed answer compares with the accepted ones.
//   exact    the same, apart from capitals and punctuation
//   accent   the same but for an accent or a trema (een for één)
//   near     a letter or two away: not right, but worth a second look
//   correct  the accepted answer closest to what was typed
export function compare(answer, accepted) {
  const list = Array.isArray(accepted) ? accepted : [accepted];
  const a = clean(answer);
  const cleaned = list.map(clean);
  let at = cleaned.indexOf(a);
  if (at !== -1) return { exact: true, accent: false, near: false, dist: 0, correct: list[at] };
  at = cleaned.findIndex(c => fold(c) === fold(a));
  if (at !== -1) return { exact: false, accent: true, near: false, dist: 0, correct: list[at] };
  let best = 0, dist = Infinity;
  cleaned.forEach((c, i) => { const d = levenshtein(c, a); if (d < dist) { dist = d; best = i; } });
  const len = cleaned[best].length;
  // One letter in a word, up to three in a long sentence. A word of three letters
  // or fewer has no "nearly": de and die are two different words.
  const near = len >= 4 && dist <= Math.min(3, Math.max(1, Math.round(len * 0.1)));
  return { exact: false, accent: false, near, dist, correct: list[best] };
}

// The words of two sentences side by side: which of the typed words are not in
// the right sentence (in that order), and which of the right ones were missed.
export function diffHtml(answer, correct) {
  const A = String(answer).trim().split(/\s+/).filter(Boolean), B = String(correct).trim().split(/\s+/).filter(Boolean);
  const ka = A.map(clean), kb = B.map(clean);
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const inA = new Array(n).fill(false), inB = new Array(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { inA[i] = inB[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const mark = (words, keep, cls) => words.map((w, k) => (keep[k] ? escHtml(w) : `<mark class="${cls}">${escHtml(w)}</mark>`)).join(' ');
  return { yours: mark(A, inA, 'ce-diff-bad'), right: mark(B, inB, 'ce-diff-good') };
}

// ── Verdicts ─────────────────────────────────────────────────────────────────
// What a card's check() hands the engine:
//   { isExact, isClose, isCorrect, quality, headline?, correct? }
//   or { retry: 'a note', keep? } when the answer is not counted and she tries again.

export const right = (quality = 5, headline) => ({ isExact: quality === 5, isClose: quality !== 5, isCorrect: true, quality, headline });
export const wrong = headline => ({ isExact: false, isClose: false, isCorrect: false, quality: 1, headline });

// A typed sentence or word that must be exactly right. A near miss gets one more
// try with the text left in the field: finding your own slip teaches more than
// being shown it. The second try is final.
//   tries    how often this card was already sent back (the card keeps count)
//   almost   the note for a near miss
export function strictVerdict(answer, accepted, { tries = 0, almost = 'Almost. Something small is off: look again and correct it.' } = {}) {
  const c = compare(answer, accepted);
  if (c.exact) return { ...right(tries ? 3 : 5, tries ? 'Correct at the second try' : undefined), correct: c.correct };
  if (c.accent) return { ...right(4, `Correct. Mind the accent: ${c.correct}`), correct: c.correct };
  if (c.near && tries === 0) return { retry: almost, keep: true };
  return { ...wrong(), correct: c.correct };
}

// "✓ Correct!" / "✓ …" / "✗ Not quite"
export function resultLine({ isExact, isCorrect, headline }) {
  const text = headline ? (isCorrect ? '✓ ' : '✗ ') + headline : isExact ? '✓ Correct!' : isCorrect ? '✓ Correct' : '✗ Not quite';
  return `<div class="ex-feedback-result ${isCorrect ? 'correct' : 'wrong'}">${escHtml(text)}</div>`;
}

// ── Pieces of the card ───────────────────────────────────────────────────────

// Append a Next / See results button and focus it, so Enter advances.
export function appendNext(container, { isLast, className, onNext }) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.type = 'button'; // not 'submit': Enter activates this button by design
  btn.textContent = isLast ? '🏁 See results' : 'Next →';
  btn.addEventListener('click', onNext);
  container.appendChild(btn);
  // The answer field is disabled once checked, so it can no longer receive the
  // keypress itself; preventScroll keeps focus from fighting the smooth scroll.
  btn.focus({ preventScroll: true });
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return btn;
}

export function scoreMessage(pct) {
  return pct === 100 ? 'Perfect score!' : pct >= 80 ? 'Great job!' : pct >= 60 ? 'Good effort!' : 'Keep practising!';
}
export function scoreEmoji(pct) {
  return pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪';
}

// "Missed this round" list. items: [{ left, right, extra?, say? }]
export function missedListHtml(items) {
  if (!items.length) return '';
  return `
    <div class="dc-missed">
      <div class="dc-missed-title">Missed this round</div>
      ${items.map(it => `
        <div class="dc-missed-row">
          <span class="dc-missed-left">${escHtml(it.left)}</span>
          <span class="dc-missed-right">${escHtml(it.right)}</span>
          <span class="dc-missed-extra">${escHtml(it.extra || '')}</span>
          <button class="dc-missed-speak" type="button" data-say="${escHtml(it.say || it.right)}" aria-label="Listen">🔊</button>
        </div>`).join('')}
    </div>`;
}

// A 🔊 button for a Dutch text.
export const sayBtn = text => `<button class="pt-say" type="button" data-say="${escHtml(text)}" aria-label="Listen">🔊</button>`;

// Wire every [data-say] button inside a container to text-to-speech.
export function wireSpeakButtons(container) {
  container.querySelectorAll('[data-say]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); speakText(btn.dataset.say); });
  });
}
