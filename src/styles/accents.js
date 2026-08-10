/* ============================================================
   OBT — Accenti (famiglie di colore)
   Ogni accento definisce SOLO le variabili di accento.
   Funziona sia in light che in dark: per il "primary-light"
   (hero, badge tenui, hover soft) servono due valori — uno
   chiaro per la modalità light, uno scuro per la dark — perché
   una tinta pastello brucia su fondo nero.

   Per aggiungere un accento: copia un blocco, cambia i 5 hex
   (primary / dark / hover / light / lightDark) e i due
   secondary/tertiary. Compare da solo nel selettore.

   NB: il testo sui bottoni pieni resta bianco (#fff) via CSS,
   quindi scegli sempre un --primary abbastanza scuro da reggere
   testo bianco.
   ============================================================ */

export const accents = {
  blu: {
    label: 'Blu',
    '--primary':        '#4A90D9',
    '--primary-dark':   '#3672B0',
    '--primary-hover':  '#5B9CE0',
    '--primary-light':      '#DCEAF7', // usato in light
    '--primary-light-dark': '#26374A', // usato in dark
    '--secondary':       '#1744A6',
    '--secondary-dark':  '#123581',
    '--secondary-hover': '#335AB1',
    '--secondary-light': '#DAE1F1',
    '--tertiary':        '#89E1FF',
    '--tertiary-dark':   '#5BB0D4',
    // testo dei badge, tarato per questi 3 colori (bianco su scuro/medio, scuro su chiaro)
    '--badge-ink-primary':   '#FFFFFF',
    '--badge-ink-secondary': '#FFFFFF',
    '--badge-ink-tertiary':  '#0C2233',
  },

  rosa: {
    label: 'Rosa',
    '--primary':        '#E86B9E',
    '--primary-dark':   '#B5537B',
    '--primary-hover':  '#EB7DAA',
    '--primary-light':      '#FBE7EF',
    '--primary-light-dark': '#4A2536',
    '--secondary':       '#D32B6E',
    '--secondary-dark':  '#A52256',
    '--secondary-hover': '#D8447F',
    '--secondary-light': '#F8DDE8',
    '--tertiary':        '#E789CB',
    '--tertiary-dark':   '#AB6596',
    '--badge-ink-primary':   '#FFFFFF',
    '--badge-ink-secondary': '#FFFFFF',
    '--badge-ink-tertiary':  '#FFFFFF',
  },


  verde: {
    label: 'Verde',
    '--primary':        '#0FA957',
    '--primary-dark':   '#0C8444',
    '--primary-hover':  '#2CB36B',
    '--primary-light':      '#D9F1E4',
    '--primary-light-dark': '#103526',
    '--secondary':       '#06620A',
    '--secondary-dark':  '#054C08',
    '--secondary-hover': '#247527',
    '--secondary-light': '#D7E6D8',
    '--tertiary':        '#62D83B',
    '--tertiary-dark':   '#49A02C',
    '--badge-ink-primary':   '#FFFFFF',
    '--badge-ink-secondary': '#FFFFFF',
    '--badge-ink-tertiary':  '#0C1A0E',
  },


  viola: {
    label: 'Viola',
    '--primary':        '#8B6FCB',
    '--primary-dark':   '#6C579E',
    '--primary-hover':  '#9980D1',
    '--primary-light':      '#ECE8F7',
    '--primary-light-dark': '#2B283F',
    '--secondary':       '#4F0E73',
    '--secondary-dark':  '#3E0B5A',
    '--secondary-hover': '#642B84',
    '--secondary-light': '#E3D8E9',
    '--tertiary':        '#E6B4FC',
    '--tertiary-dark':   '#AA85BA',
    '--badge-ink-primary':   '#FFFFFF',
    '--badge-ink-secondary': '#FFFFFF',
    '--badge-ink-tertiary':  '#1A0A26',
  },
};

export const DEFAULT_ACCENT = 'blu';
