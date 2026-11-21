// ── One screen with every number the app keeps ───────────────────────────────
// The streak, each course with what was learned and what is due, how the
// grammar exercises go, and when the last backup was. "Weak" is the number the
// weak-spots list on Home adds up, so the two always agree.

import { escHtml, count } from './utils.js';
import { getCourses } from './review.js';
import { UNITS } from './data/path/index.js';
import { unitsDone } from './data/path-progress.js';
import { grammarTotals } from './data/grammar-progress.js';
import { currentStreak, lastDays, totalAnswers, activeDays } from './data/activity.js';
import { backupStatus, backupDue } from './backup-ui.js';

function bar(pct, cls = '') {
  return `<div class="pg-bar"><div class="pg-bar-fill ${cls}" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
}

export function openProgressScreen() {
  window.showScreen('progressScreen');
  const s = document.getElementById('progressScreen');

  const courseRow = c => {
    const st = c.stats();
    const line = st.seen ? `${st.learned} / ${st.total} ${c.unit} learned · ${st.seen} seen${st.weak ? ` · ${st.weak} weak` : ''}` : c.fresh;
    return `
    <button class="pg-card pg-row" onclick="${c.open}">
      <span class="pg-row-icon">${c.icon}</span>
      <span class="pg-row-text">
        <span class="pg-row-title">${escHtml(c.name)} ${st.due ? `<span class="pg-due">${st.due} due</span>` : ''}</span>
        <span class="pg-row-sub">${escHtml(line)}</span>
        ${st.seen ? bar(st.learned / st.total * 100, 'pg-fill-pink') : ''}
      </span>
    </button>`;
  };

  const streak = currentStreak();
  const days = lastDays(14);
  const maxDay = Math.max(1, ...days.map(d => d.count));
  const weekday = d => d.toLocaleDateString('en-GB', { weekday: 'narrow' });
  const g = grammarTotals();
  const gPct = g.answers ? Math.round(g.correct / g.answers * 100) : null;
  const done = unitsDone();
  const due = backupDue();

  s.innerHTML = `
    <div class="lesson-header">
      <button class="back-btn" onclick="showScreen('homeScreen')" aria-label="Back">←</button>
      <div>
        <div class="lesson-title">📊 Progress</div>
        <div class="lesson-subtitle">Everything the app remembers about your practice</div>
      </div>
    </div>

    <div class="pg-card pg-streak">
      <div class="pg-streak-num">${streak > 0 ? '🔥 ' + streak : '💤'}</div>
      <div class="pg-streak-text">
        <div class="pg-streak-title">${streak > 0 ? `${streak}-day streak` : 'No streak yet'}</div>
        <div class="pg-streak-sub">${count(totalAnswers(), 'answer')} over ${count(activeDays(), 'day')}</div>
      </div>
      <div class="pg-days">
        ${days.map(d => `<div class="pg-day" title="${d.key}: ${d.count}"><div class="pg-day-bar" style="height:${Math.round(d.count / maxDay * 100)}%"></div><div class="pg-day-label">${weekday(d.date)}</div></div>`).join('')}
      </div>
    </div>

    <div class="pg-section">The course</div>
    <button class="pg-card pg-row" onclick="openPathScreen()">
      <span class="pg-row-icon">📘</span>
      <span class="pg-row-text">
        <span class="pg-row-title">${done} / ${UNITS.length} units done</span>
        <span class="pg-row-sub">A unit is done when its words, its sentences and its exercises have each been through once</span>
        ${bar(done / UNITS.length * 100, 'pg-fill-green')}
      </span>
    </button>
    <button class="pg-card pg-row" onclick="openGrammarScreen()">
      <span class="pg-row-icon">📖</span>
      <span class="pg-row-text">
        <span class="pg-row-title">Grammar ${gPct != null ? `<span class="pg-pct">${gPct}%</span>` : ''}</span>
        <span class="pg-row-sub">${g.answers ? `${count(g.answers, 'exercise')} answered over ${count(g.points, 'grammar point')}${g.weak ? ` · ${g.weak} to work on` : ''}` : 'No exercises answered yet'}</span>
        ${gPct != null ? bar(gPct, gPct >= 85 ? 'pg-fill-green' : gPct >= 70 ? 'pg-fill-amber' : 'pg-fill-red') : ''}
      </span>
    </button>

    <div class="pg-section">Learned and scheduled</div>
    ${getCourses().map(courseRow).join('')}

    <div class="pg-section">Backup</div>
    <button class="pg-card pg-row ${due ? 'pg-backup-old' : ''}" onclick="toggleSettingsDrawer()">
      <span class="pg-row-icon">💾</span>
      <span class="pg-row-text">
        <span class="pg-row-title">${escHtml(backupStatus())}</span>
        <span class="pg-row-sub">${due
          ? 'Time for a backup: your progress lives only in this browser. The buttons are in Settings.'
          : 'Making and restoring a backup is done in Settings.'}</span>
      </span>
    </button>`;
}
