// ── Irregular verbs: the course ──────────────────────────────────────────────
// The strong verbs in groups that change their vowel the same way. A group is
// learned five verbs at a time: each verb is shown with all its forms, then its
// simple past is asked, then its perfect with the auxiliary. Both forms of every
// verb go on the shared review schedule (data/verb-progress.js).

import { escHtml, shuffle, count } from '../utils.js';
import { showScreen } from '../router.js';
import { openSheet } from '../sheet.js';
import { VERB_GROUPS, VERBS, perfForms, pastForms, auxName } from '../data/strong-verbs.js';
import { pastKey, perfKey, keysOf, verbEntry, recordVerb, regradeVerb, verbStats, dueVerbKeys, weakVerbKeys, isNewVerb, isLearnedVerb } from '../data/verb-progress.js';
import { runSession } from './course-engine.js';
import { clean, compare, strictVerdict, right, wrong, sayBtn, wireSpeakButtons } from './drill-core.js';

export const COURSE = { icon: '🔀', name: 'Irregular verbs' };
const ACCENT = { main: '#7c3aed', dark: '#5b21b6', soft: '#f5f3ff', border: '#c4b5fd' };
const BATCH = 5;

const getScreen = () => document.getElementById('verbsScreen');
const byInf = new Map(VERBS.map(v => [v.inf, v]));

export function openVerbsScreen() {
  showScreen('verbsScreen');
  showMenu();
}

// ── Menu ─────────────────────────────────────────────────────────────────────

const formsLine = v => `${v.past}${v.pastPl ? `, ${v.pastPl}` : ''}${v.part ? ` · ${perfForms(v).join(' / ')}` : ''}`;

function showMenu() {
  const s = getScreen();
  const st = verbStats();
  const due = dueVerbKeys().length, weak = weakVerbKeys().length;
  const learned = VERBS.filter(isLearnedVerb).length;
  const firstOpen = VERB_GROUPS.find(g => g.verbs.some(isNewVerb));

  const groupCard = g => {
    const fresh = g.verbs.filter(isNewVerb).length, done = g.verbs.filter(isLearnedVerb).length;
    const pct = Math.round(done / g.verbs.length * 100);
    return `
    <div class="vb-group ${g === firstOpen ? 'vb-group-next' : ''}">
      <div class="vb-group-head">
        <span class="vb-group-title">${escHtml(g.title)}</span>
        <span class="vb-group-count">${done} / ${g.verbs.length}</span>
      </div>
      <div class="vb-group-pattern">${escHtml(g.pattern)}</div>
      <div class="vb-group-bar"><div style="width:${pct}%"></div></div>
      <div class="vb-group-actions">
        ${fresh ? `<button class="vb-btn vb-btn-main" type="button" data-learn="${g.id}">▶ Learn ${Math.min(BATCH, fresh)} new</button>`
                : `<button class="vb-btn vb-btn-main" type="button" data-practise="${g.id}">🔄 Practise the group</button>`}
        <button class="vb-btn" type="button" data-table="${g.id}">📋 All forms</button>
      </div>
    </div>`;
  };

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" id="vbBack" type="button" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">${COURSE.icon} ${COURSE.name}</div>
        <div class="lesson-subtitle">The simple past and the perfect, pattern by pattern</div>
      </div>
    </div>

    <div class="pt-stats-bar">
      <span class="pt-stat">🔀 ${learned} / ${VERBS.length} verbs learned</span>
      <span class="pt-stat ${due ? 'pt-stat-due' : ''}">🔄 ${due} due</span>
      <span class="pt-stat">🎯 ${weak} weak</span>
    </div>

    ${due ? `<button class="pt-continue" id="vbDue" type="button">
      <span class="pt-continue-icon">🔄</span>
      <span><span class="pt-continue-title">Review: ${count(due, 'form')} due</span><br><span class="pt-continue-sub">What you learned before, just before you would forget it</span></span>
    </button>` : ''}
    ${weak ? `<button class="vc-browse-btn" id="vbWeak" type="button">🎯 Practise the ${count(weak, 'form')} that go wrong most</button>` : ''}
    ${st.seen ? '' : `<div class="pt-hint">Dutch has about 150 verbs that change their vowel in the past. They come in families: learn the pattern of a family and most of its verbs follow. Start with the first group.</div>`}

    <div class="vb-groups">${VERB_GROUPS.map(groupCard).join('')}</div>`;

  s.querySelector('#vbBack').addEventListener('click', () => showScreen('homeScreen'));
  s.querySelector('#vbDue')?.addEventListener('click', startVerbReview);
  s.querySelector('#vbWeak')?.addEventListener('click', startWeak);
  s.querySelectorAll('[data-learn]').forEach(b => b.addEventListener('click', () => startLearn(groupOf(b.dataset.learn))));
  s.querySelectorAll('[data-practise]').forEach(b => b.addEventListener('click', () => startPractise(groupOf(b.dataset.practise))));
  s.querySelectorAll('[data-table]').forEach(b => b.addEventListener('click', () => openTable(groupOf(b.dataset.table))));
  s.scrollTo({ top: 0 });
}
const groupOf = id => VERB_GROUPS.find(g => g.id === id);

// All forms of a group, as a sheet over the menu.
function openTable(g) {
  const dot = v => { const e = verbEntry(pastKey(v)); return !e ? '' : isLearnedVerb(v) ? 'pt-dot-green' : 'pt-dot-yellow'; };
  openSheet({
    title: `${COURSE.icon} ${g.title}`,
    html: `
      <p class="vb-note">${escHtml(g.note)}</p>
      <div class="pt-table-wrap"><table class="pt-table vb-table">
        <thead><tr><th>verb</th><th>simple past</th><th>perfect</th></tr></thead>
        <tbody>${g.verbs.map(v => `<tr>
          <th><span class="pt-word-dot ${dot(v)}"></span>${escHtml(v.inf)} ${sayBtn(v.inf)}<br><span class="vb-en">${escHtml(v.en)}</span></th>
          <td>${escHtml(v.past)}<br><span class="vb-en">${escHtml(v.pastPl)}</span></td>
          <td>${v.part ? escHtml(perfForms(v).join(' / ')) : '–'}</td>
        </tr>`).join('')}</tbody>
      </table></div>`,
    onOpen: wireSpeakButtons,
  });
}

// ── Cards ────────────────────────────────────────────────────────────────────

const detail = v => `
  <div class="pt-detail-full">${escHtml(v.inf)} · ${escHtml(v.past)}${v.pastPl ? `, ${escHtml(v.pastPl)}` : ''}${v.part ? ` · ${escHtml(perfForms(v).join(' / '))}` : ''}</div>
  <div class="pt-detail-en">${escHtml(v.en)}${v.aux === 'hz' ? ' · zijn when it is about going somewhere or a change, hebben otherwise' : ''}</div>`;

// The perfect is typed with its auxiliary: leaving it out is sent back, the wrong one is a miss.
function checkPerf(v, answer, tries) {
  const a = clean(answer);
  const m = a.match(/^(heeft|hebt|heb|hebben|is|ben|bent|zijn)\s+(.+)$/);
  const part = m ? m[2] : a;
  const typed = m ? (/^(is|ben|bent|zijn)$/.test(m[1]) ? 'z' : 'h') : null;
  const c = compare(part, v.part);
  const shown = perfForms(v)[0];
  if (!typed && (c.exact || c.near) && tries < 2) return { retry: 'With its auxiliary: heeft or is?', keep: true };
  if (c.exact && typed && !v.aux.includes(typed)) return { ...wrong(`Right participle, but it goes with ${v.aux === 'z' ? 'is' : 'heeft'}`), correct: shown };
  if (c.exact && typed) return { ...right(tries ? 3 : 5, tries ? 'Correct' : undefined), correct: `${typed === 'z' ? 'is' : 'heeft'} ${v.part}` };
  if (c.near && tries === 0) return { retry: 'Almost. Check the spelling and try once more.', keep: true };
  return { ...wrong(), correct: shown };
}

// kind: 'intro' (all forms shown, the simple past copied), 'past', 'perf'
function verbCard(v, kind, { practice = false } = {}) {
  const intro = kind === 'intro';
  const key = kind === 'perf' ? perfKey(v) : pastKey(v);
  const answer = kind === 'perf' ? perfForms(v)[0] : pastForms(v)[0];
  let tries = 0;
  return {
    key: intro ? `intro:${v.inf}` : key, course: COURSE, intro,
    promptHtml: `
      <div class="pt-q-card ${intro ? 'pt-q-intro' : ''}">
        ${intro ? `<div class="pt-q-badge">✨ New verb</div>` : `<div class="pt-q-label">${kind === 'perf' ? 'Perfect: hij …' : 'Simple past: ik …'}</div>`}
        <div class="pt-q-main">${escHtml(v.inf)} ${sayBtn(v.inf)}</div>
        <div class="pt-q-hint">${escHtml(v.en)}</div>
        ${intro ? `<div class="vb-forms">
            <span><b>${escHtml(v.past)}</b>${v.pastPl ? `, ${escHtml(v.pastPl)}` : ''} ${sayBtn(pastForms(v)[0])}</span>
            ${v.part ? `<span><b>${escHtml(perfForms(v).join(' / '))}</b> ${sayBtn(perfForms(v)[0])}</span>` : ''}
          </div>
          <div class="pt-q-hint">Say the forms, then type the simple past (ik …)</div>` : ''}
      </div>`,
    autoSay: intro ? `${v.inf}, ${pastForms(v)[0]}${v.part ? `, ${perfForms(v)[0]}` : ''}` : null,
    input: { type: 'text', placeholder: kind === 'perf' ? 'heeft … or is …' : 'ik …' },
    check(typedAnswer) {
      const res = kind === 'perf' ? checkPerf(v, typedAnswer, tries)
        : strictVerdict(typedAnswer.replace(/^(ik|hij|zij|ze|het)\s+/i, ''), pastForms(v), { tries, almost: 'Almost. Check the spelling and try once more.' });
      if (res.retry) tries++;
      return res;
    },
    record: res => (practice ? null : recordVerb(key, res.quality)),
    override: null,
    correctText: answer,
    detailHtml: intro ? '' : detail(v),
    say: intro ? null : answer,
    missed: { left: `${v.inf} (${kind === 'perf' ? 'perfect' : 'past'})`, right: answer, extra: v.en, say: answer },
  };
}

const cardOfKey = key => {
  const [, inf, kind] = key.split(':');
  const v = byInf.get(inf);
  return v ? verbCard(v, kind) : null;
};

// ── Sessions ─────────────────────────────────────────────────────────────────

function run(title, cards, { onExit = showMenu, again = () => null, warmUp = 0 } = {}) {
  showScreen('verbsScreen');
  if (!cards.length) { showMenu(); return; }
  runSession({ screen: getScreen(), icon: COURSE.icon, title, accent: ACCENT, cards, onExit, again, warmUp, warmUpSource: warmUp ? () => shuffle(verbDueCards()) : null });
}

// The next five new verbs of a group: shown, then the past of each, then the perfect of each.
function startLearn(g) {
  const batch = g.verbs.filter(isNewVerb).slice(0, BATCH);
  if (!batch.length) { startPractise(g); return; }
  const cards = [
    ...batch.map(v => verbCard(v, 'intro')),
    ...shuffle(batch).map(v => verbCard(v, 'past')),
    ...shuffle(batch.filter(v => v.part)).map(v => verbCard(v, 'perf')),
  ];
  run(g.title, cards, {
    warmUp: 5,
    again: () => {
      const left = g.verbs.filter(isNewVerb).length;
      if (left) return { label: `▶ Next ${Math.min(BATCH, left)} of this group`, run: () => startLearn(g) };
      const next = VERB_GROUPS.find(x => x.verbs.some(isNewVerb));
      return next ? { label: `→ Next group: ${next.title}`, run: () => startLearn(next) } : null;
    },
  });
}

// A whole group again, both forms of every verb, without touching the schedule.
function startPractise(g) {
  const cards = shuffle(g.verbs.flatMap(v => [verbCard(v, 'past', { practice: true }), ...(v.part ? [verbCard(v, 'perf', { practice: true })] : [])])).slice(0, 24);
  run(g.title, cards, { again: () => ({ label: '🔄 Another round', run: () => startPractise(g) }) });
}

function startWeak() {
  run('Weak forms', shuffle(weakVerbKeys()).slice(0, 25).map(cardOfKey).filter(Boolean));
}

// ── Review ───────────────────────────────────────────────────────────────────

export const verbDueCards = () => dueVerbKeys().map(cardOfKey).filter(Boolean);

export function startVerbReview() {
  showScreen('reviewScreen');
  const cards = shuffle(verbDueCards()).slice(0, 30);
  if (!cards.length) { window.openReviewScreen(); return; }
  runSession({
    screen: document.getElementById('reviewScreen'), icon: COURSE.icon, title: COURSE.name, accent: ACCENT, cards,
    onExit: () => window.openReviewScreen(),
    again: () => { const left = dueVerbKeys().length; return left ? { label: `🔄 Keep going: ${left} left`, run: startVerbReview } : null; },
  });
}

export { startWeak as startVerbWeak };
