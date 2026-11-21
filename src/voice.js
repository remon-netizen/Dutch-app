// ── The Dutch voice ──────────────────────────────────────────────────────────
// Every 🔊 button speaks through the browser's own text-to-speech. Which voices
// there are depends on the device; the best Dutch one is picked, and Settings
// lets the learner choose another.

import { state, TTS_LANG } from './state.js';
import { store } from './store.js';
import { showToast } from './toast.js';

const SAVED = 'voiceName';

function scoreVoice(v) {
  let score = 0;
  const name = v.name.toLowerCase();
  if (name.includes('natural'))  score += 40;
  if (name.includes('online'))   score += 30;
  if (name.includes('neural'))   score += 30;
  if (name.includes('google'))   score += 10;
  if (v.localService === false)  score += 5;
  // Dutch as spoken in the Netherlands before Flemish: that is what the course teaches.
  if (v.lang.replace('_', '-').toLowerCase() === 'nl-nl') score += 20;
  return score;
}

// Fills the voice picker in Settings. `settled` = the browser has had its chance
// to hand over its voices, so an empty list means there really are none.
let voicesSettled = false;
function populate(settled = true) {
  if (settled) voicesSettled = true;
  const all = state.synth ? state.synth.getVoices() : [];
  state.voices = all.filter(v => v.lang.toLowerCase().startsWith('nl')).sort((a, b) => scoreVoice(b) - scoreVoice(a));

  const sel = document.getElementById('voiceSelect');
  if (!sel) return;
  const nameEl = document.getElementById('vcName'), qualityEl = document.getElementById('vcQuality');

  if (state.voices.length === 0) {
    const none = settled ? 'No Dutch voice on this device' : 'Loading voices…';
    sel.innerHTML = `<option>${none}</option>`;
    nameEl.textContent = none;
    qualityEl.textContent = settled
      ? 'The 🔊 buttons stay silent without one. On a computer, Microsoft Edge has Dutch voices built in. On a phone or tablet, add Dutch under text-to-speech in the system settings.'
      : '';
    qualityEl.className = 'vc-quality standard';
    return;
  }

  sel.innerHTML = state.voices.map((v, i) => `<option value="${i}">${v.name}</option>`).join('');
  const saved = store.getItem(SAVED);
  const savedIdx = saved ? state.voices.findIndex(v => v.name === saved) : -1;
  const idx = savedIdx >= 0 ? savedIdx : 0;
  sel.value = idx;
  applyVoice(idx, savedIdx >= 0);
}

// Called at start-up.
let listening = false;
export function loadVoices() {
  if (!state.synth) { populate(true); return; }
  const ready = state.synth.getVoices().length > 0;
  populate(ready || voicesSettled);
  if (listening) return;
  listening = true;
  // Most browsers hand over their voices a moment after load, through this event.
  state.synth.addEventListener('voiceschanged', () => populate(true));
  // Some never fire it: after a few seconds an empty list is final.
  if (!ready) setTimeout(() => populate(true), 3000);
}

// True once the browser has handed over its voices and none of them speaks Dutch.
export function hasNoVoice() {
  return voicesSettled && state.voices.length === 0;
}

// remember: false when the app picked the voice itself (so a better voice that
// shows up later can still win), true when the learner chose it.
function applyVoice(idx, remember = true) {
  const v = state.voices[idx];
  if (!v) return;
  state.selectedVoice = v;
  if (remember) store.setItem(SAVED, v.name);
  const nameEl = document.getElementById('vcName'), qualityEl = document.getElementById('vcQuality');
  if (nameEl) nameEl.textContent = v.name;
  const neural = /natural|online|neural/i.test(v.name);
  if (qualityEl) {
    qualityEl.textContent = neural ? '✓ Neural voice: high quality' : 'Standard voice';
    qualityEl.className = 'vc-quality ' + (neural ? 'neural' : 'standard');
  }
}

export function changeVoice() {
  applyVoice(parseInt(document.getElementById('voiceSelect').value, 10));
}

export function testVoice() {
  speakText('Hallo! Hoe gaat het? Vandaag oefenen we Nederlands.');
}

// Without a Dutch voice a tap on 🔊 does nothing at all. Say so, once per visit,
// with the way to Settings where it is explained.
let warnedSilent = false;
function warnIfSilent() {
  if (warnedSilent || !hasNoVoice()) return;
  if (document.querySelector('.wl-overlay.open')) return;   // a sheet covers the screen: wait for the next time
  warnedSilent = true;
  showToast('This device has no Dutch voice: the 🔊 buttons do not work here.',
    { action: 'What now?', onAction: () => window.toggleSettingsDrawer() });
}

export function speakText(text) {
  if (!state.synth || !text) return;
  warnIfSilent();
  state.synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = TTS_LANG;
  utt.rate = state.speechRate;
  if (state.selectedVoice) utt.voice = state.selectedVoice;
  state.synth.speak(utt);
}
