#!/usr/bin/env node
// Press random buttons, type random text and jump between screens, for a while,
// and see whether the app ever throws. The sequence is repeatable: give the same seed.
//   node tools/browser/random-presses.mjs [steps=4000] [seed=1]

import { withPage } from './harness.mjs';

const steps = Number(process.argv[2]) || 4000, seed = Number(process.argv[3]) || 1;

const result = await withPage(async page => {
  // Something behind the app in the history, so that stepping out of the app is noticed.
  await page.goto('about:blank'); await page.goto();
  const r = await page.eval(`
    let s = ${seed};
    const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const words = ['de', 'het', 'huis', 'ik werk', 'is gegaan', 'ging', 'x', 'Morgen ga ik naar huis.', 'één', "auto's", '   ', 'heeft'];
    const opens = ['openPathScreen', 'openGrammarScreen', 'openVerbsScreen', 'openDeHetScreen', 'openReviewScreen', 'openProgressScreen', 'openWeakSpots', 'toggleSettingsDrawer'];
    const trail = [], errors = [];
    window.addEventListener('error', e => errors.push({ msg: e.message, after: trail.slice(-6) }));
    window.addEventListener('unhandledrejection', e => errors.push({ msg: String(e.reason), after: trail.slice(-6) }));
    window.confirm = () => false;                         // never restore a backup
    const pause = ms => new Promise(r => setTimeout(r, ms));
    // Visible, and not under a sheet or the settings drawer (a finger cannot reach through those).
    const cover = () => document.querySelector('.wl-overlay.open') || (document.querySelector('.settings-drawer.open') ? document.getElementById('settingsDrawer') : null);
    const visible = el => { if (el.offsetParent === null || el.disabled) return false; const c = cover(); return c ? c.contains(el) : !el.closest('.settings-drawer'); };
    for (let i = 0; i < ${steps} && errors.length < 5; i++) {
      const roll = rnd();
      if (roll < 0.03) { const f = pick(opens); if (typeof window[f] !== 'function') continue; trail.push(f); window[f](); await pause(0); continue; }
      if (roll < 0.05) { trail.push('home'); window.showScreen('homeScreen'); await pause(0); continue; }
      // The back gesture, where the app has somewhere to go back to (on Home, with nothing open, it would rightly leave the app).
      if (roll < 0.07) {
        const away = document.querySelector('.screen.active')?.id !== 'homeScreen' || document.querySelector('.settings-drawer.open, .wl-overlay.open');
        // A person is slower than the browser: a step back the app itself took a moment ago
        // has landed before the gesture comes, and the gesture has landed before the next press.
        if (away) {
          await pause(80);
          trail.push('back'); history.back();
          await new Promise(r => { const t = setTimeout(r, 1000); window.addEventListener('popstate', () => { clearTimeout(t); setTimeout(r, 0); }, { once: true }); });
        }
        continue;
      }
      const field = [...document.querySelectorAll('#ceInput, .gr-search')].find(visible);
      if (field && roll < 0.45) { const w = pick(words); trail.push('type ' + w); field.value = w; field.dispatchEvent(new Event('input')); if (rnd() < 0.8) field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); continue; }
      const btns = [...document.querySelectorAll('button, summary')].filter(visible).filter(b => !/bkDownload|bkRestore/.test(b.id) && !b.closest('.update-toast'));
      if (!btns.length) continue;
      const b = pick(btns);
      trail.push('click ' + (b.id || b.className || b.textContent.trim().slice(0, 20)));
      b.click();
      await pause(0);
    }
    return { errors, last: trail.slice(-3), screen: document.querySelector('.screen.active')?.id, stillTheApp: location.pathname.endsWith('index.html') };
  `);
  return { ...r, pageErrors: page.errors };
}).catch(e => ({ errors: [{ msg: 'the page went away: ' + e.message, after: [] }], pageErrors: [], screen: '?', stillTheApp: false }));

console.log(`${steps} steps, seed ${seed}: ended on ${result.screen}${result.stillTheApp ? '' : ' (the app was left!)'}`);
for (const e of result.errors) console.log(`ERROR ${e.msg}\n   after: ${e.after.join(' → ')}`);
for (const e of result.pageErrors) console.log(`PAGE ${e}`);
const bad = result.errors.length + result.pageErrors.length + (result.stillTheApp ? 0 : 1);
console.log(bad ? `${bad} problems` : 'no errors');
process.exit(bad ? 1 : 0);
