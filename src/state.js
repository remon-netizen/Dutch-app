// ── What the app knows while it runs ─────────────────────────────────────────
// The app teaches Dutch and explains it in English; neither can be changed.

import { store } from './store.js';

export const TTS_LANG = 'nl-NL';

export const state = {
  synth: window.speechSynthesis || null,
  speechRate: parseFloat(store.getItem('speechRate') || '1.0') || 1.0,
  voices: [],          // the Dutch voices of this device, best first
  selectedVoice: null,
};
