/* ============================================================
   OBT — Modalità (superfici neutre)
   Ogni modalità definisce SOLO i neutri: sfondi, testo, bordi,
   ombre, superfici dei componenti (tooltip, overlay, tab...).
   NON tocca l'accento — quello vive in accents.js.

   Per aggiungere una modalità (es. un "dark AMOLED" nero puro):
   copia un blocco, cambia i neutri. Funziona con ogni accento.

   La chiave '--mode-primary-light' dice quale delle due varianti
   di primary-light usare (light -> '--primary-light',
   dark -> '--primary-light-dark'); la risolve applyTheme().
   ============================================================ */

export const modes = {
  light: {
    label: 'Chiaro',
    '--theme-type': 'light',

    /* Sfondo/superfici tinte verso l'accento (niente beige!): il neutro
       nasce da --primary mescolato a bianco, così cambia con l'accento. */
    '--bg':        'color-mix(in srgb, var(--primary) 9%, #FFFFFF)',
    '--card':      '#FFFFFF',
    '--surface':   'color-mix(in srgb, var(--primary) 5%, #FFFFFF)',

    '--ink':       'color-mix(in srgb, var(--primary-dark) 32%, #2B2B33)',
    '--ink-soft':  'color-mix(in srgb, var(--primary-dark) 28%, #7A7A88)',
    '--muted':     'color-mix(in srgb, var(--primary-dark) 28%, #7A7A88)',

    '--line':      'color-mix(in srgb, var(--primary) 16%, #E6E9EF)',

    /* superfici componenti */
    '--tab-grad-1':      '#FFFFFF',
    '--tab-grad-2':      'color-mix(in srgb, var(--primary) 7%, #FFFFFF)',
    '--tab-grad-2-hover':'color-mix(in srgb, var(--primary) 13%, #FFFFFF)',
    '--tooltip-bg':      'color-mix(in srgb, var(--primary-dark) 55%, #1E2430)',
    '--tooltip-ink':     '#FFFFFF',
    '--overlay':         'color-mix(in srgb, var(--primary-dark) 5%, rgba(30, 34, 46, 0.3))',
    '--hero-info-bg':    'rgba(255, 255, 255, 0.55)',
    '--input-focus-bg':  '#FFFFFF',

    /* stati semantici (uguali nelle due modalità: qui il colore È informazione) */
    '--good-bg': '#DFF3E6', '--good-text': '#3F8F5C',
    '--mid-bg':  '#FCF3D9', '--mid-text':  '#A9820F',
    '--bad-bg':  '#FBE2E2', '--bad-text':  '#C1504F',

    '--shadow':       '0 2px 10px rgba(55, 65, 85, 0.08), 0 1px 2px rgba(55, 65, 85, 0.06)',
    '--shadow-hover': '0 6px 20px rgba(55, 65, 85, 0.14), 0 2px 4px rgba(55, 65, 85, 0.08)',

    '--mode-primary-light': 'light',
  },

  dark: {
    label: 'Scuro',
    '--theme-type': 'dark',

    /* near-black FREDDO (canale blu alzato) + velo minimo di accento:
       calibrato perché anche accenti caldi (arancione/rosso) NON scivolino
       nel tortora. Cambia tinta con l'accento restando neutro-freddo. */
    '--bg':        'color-mix(in srgb, var(--primary) 7%, #181A20)',
    '--card':      'color-mix(in srgb, var(--primary) 6%, #232630)',
    '--surface':   'color-mix(in srgb, var(--primary) 6%, #1E2028)',

    '--ink':       '#ECEDEF',
    '--ink-soft':  'color-mix(in srgb, var(--primary) 12%, #949AA6)',
    '--muted':     'color-mix(in srgb, var(--primary) 12%, #949AA6)',

    '--line':      'color-mix(in srgb, var(--primary) 16%, #363A44)',

    '--tab-grad-1':      'color-mix(in srgb, var(--primary) 9%, #2A2D37)',
    '--tab-grad-2':      'color-mix(in srgb, var(--primary) 6%, #232630)',
    '--tab-grad-2-hover':'color-mix(in srgb, var(--primary) 13%, #30333E)',
    '--tooltip-bg':      'color-mix(in srgb, var(--primary) 6%, #0D0F14)',
    '--tooltip-ink':     '#ECEDEF',
    '--overlay':         'rgba(8, 9, 13, 0.62)',
    '--hero-info-bg':    'rgba(0, 0, 0, 0.22)',
    '--input-focus-bg':  'color-mix(in srgb, var(--primary) 9%, #2A2D37)',

    /* stati semantici: leggermente scuriti per non brillare sul nero,
       ma restano verde/giallo/rosso perché veicolano informazione */
    '--good-bg': '#1E3A2A', '--good-text': '#6FCF97',
    '--mid-bg':  '#3A331A', '--mid-text':  '#E3C05A',
    '--bad-bg':  '#3A2323', '--bad-text':  '#E88C8C',

    '--shadow':       '0 2px 10px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.3)',
    '--shadow-hover': '0 6px 20px rgba(0, 0, 0, 0.45), 0 2px 4px rgba(0, 0, 0, 0.35)',

    '--mode-primary-light': 'dark',
  },
};

export const DEFAULT_MODE = 'light';
