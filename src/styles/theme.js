/* ============================================================
   OBT — Motore temi
   Un tema = una modalità (modes.js) + un accento (accents.js),
   combinati a runtime e scritti come variabili CSS su <html>.
   Scelta persistita in localStorage.
   ============================================================ */

import { modes, DEFAULT_MODE } from './modes.js';
import { accents, DEFAULT_ACCENT } from './accents.js';

const LS_MODE   = 'obt-mode';
const LS_ACCENT = 'obt-accent';

// chiavi "meta" che non sono variabili CSS da scrivere sul DOM
const META = new Set(['label', '--theme-type', '--mode-primary-light']);

export function getSavedMode() {
  const m = localStorage.getItem(LS_MODE);
  return modes[m] ? m : DEFAULT_MODE;
}

export function getSavedAccent() {
  const a = localStorage.getItem(LS_ACCENT);
  return accents[a] ? a : DEFAULT_ACCENT;
}

export function applyTheme(modeKey, accentKey) {
  const mode   = modes[modeKey]     || modes[DEFAULT_MODE];
  const accent = accents[accentKey] || accents[DEFAULT_ACCENT];
  const root   = document.documentElement;

  // 1) neutri della modalità
  for (const [k, v] of Object.entries(mode)) {
    if (!META.has(k)) root.style.setProperty(k, v);
  }

  // 2) accento
  for (const [k, v] of Object.entries(accent)) {
    if (META.has(k)) continue;
    // primary-light / primary-light-dark: scegli in base alla modalità
    if (k === '--primary-light' || k === '--primary-light-dark') continue;
    root.style.setProperty(k, v);
  }
  const useDark = mode['--mode-primary-light'] === 'dark';
  root.style.setProperty(
    '--primary-light',
    useDark ? accent['--primary-light-dark'] : accent['--primary-light']
  );

  // 3) attributi per hook CSS (es. color-scheme, override mirati)
  root.setAttribute('data-theme', modeKey);
  root.setAttribute('data-accent', accentKey);
  root.style.colorScheme = mode['--theme-type'] === 'dark' ? 'dark' : 'light';

  localStorage.setItem(LS_MODE, modeKey);
  localStorage.setItem(LS_ACCENT, accentKey);
}

/* Applica il tema salvato il prima possibile. Chiamata anche inline
   in main.jsx per evitare il flash del tema di default al primo paint. */
export function initTheme() {
  applyTheme(getSavedMode(), getSavedAccent());
}
