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
  },

  rosa: {
    label: 'Rosa',
    '--primary':        '#E86B9E',
    '--primary-dark':   '#B84577',
    '--primary-hover':  '#EE7EAC',
    '--primary-light':      '#FBE4EE',
    '--primary-light-dark': '#4A2536',
    '--secondary':       '#EF9BBF',
    '--secondary-dark':  '#C25E8B',
    '--secondary-hover': '#F3ABCA',
    '--secondary-light': '#FCEDF4',
    '--tertiary':        '#F5B9D3',
    '--tertiary-dark':   '#C25E8B',
  },


  verde: {
    label: 'Verde',
    '--primary':        '#4CAF7A',
    '--primary-dark':   '#358159',
    '--primary-hover':  '#5CBE89',
    '--primary-light':      '#DCF1E6',
    '--primary-light-dark': '#213A2D',
    '--secondary':       '#7BC79E',
    '--secondary-dark':  '#3E9066',
    '--secondary-hover': '#8BD0AB',
    '--secondary-light': '#E6F5EC',
    '--tertiary':        '#A0D6BB',
    '--tertiary-dark':   '#3E9066',
  },


  viola: {
    label: 'Viola',
    '--primary':        '#8B6FCB',
    '--primary-dark':   '#6748A8',
    '--primary-hover':  '#9A81D5',
    '--primary-light':      '#EAE2FA',
    '--primary-light-dark': '#312845',
    '--secondary':       '#A992DC',
    '--secondary-dark':  '#7458B8',
    '--secondary-hover': '#B5A2E2',
    '--secondary-light': '#F0EAFA',
    '--tertiary':        '#C0AEE6',
    '--tertiary-dark':   '#7458B8',
  },

  lilla: {
    label: 'Lilla',
    '--primary':        '#B08BD6',
    '--primary-dark':   '#8A63B5',
    '--primary-hover':  '#BC9BDD',
    '--primary-light':      '#F1E8FA',
    '--primary-light-dark': '#382C45',
    '--secondary':       '#C6A8E2',
    '--secondary-dark':  '#9A76C2',
    '--secondary-hover': '#D0B6E8',
    '--secondary-light': '#F5EEFB',
    '--tertiary':        '#D7C1EC',
    '--tertiary-dark':   '#9A76C2',
  },
};

export const DEFAULT_ACCENT = 'blu';
