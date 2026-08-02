// -----------------------------------------------------------------------------
// DATI INCUBAZIONE UOVA — OviPets
// -----------------------------------------------------------------------------
// La tabella di gioco dà le ORE PER TURNO, distinte per livello (1-4 / 5) e
// tipo (Regular / Ovi+). Una gestazione ha 4 intervalli di rotazione ai quarti:
//   click a 0% → 25% → 50% → 75% → schiusa 100%
// Ogni intervallo dura ESATTAMENTE 1 turno, quindi:
//   gestazione_totale = ore_per_turno × 4
// I quarti sono equidistanti sia nel tempo sia in percentuale, quindi il tempo
// è LINEARE nella %: ore = (% / 100) × totale.
//
// PER AGGIUNGERE UNA SPECIE: copia un blocco e metti le 4 ore/turno dalla tabella.
// -----------------------------------------------------------------------------

// Checkpoint percentuali di rotazione (universali, uguali per tutte le specie).
export const ROTATION_CHECKPOINTS = [0, 25, 50, 75, 100]

// Numero di intervalli di rotazione (0→25, 25→50, 50→75, 75→100).
export const INTERVALS = 4

// Ore per turno per specie. Chiavi: 'reg14' | 'ovi14' | 'reg5' | 'ovi5'.
// reg = Regular, ovi = Ovi+, 14 = Lv 1-4, 5 = Lv 5.
export const SPECIES_HOURS = {
  Lupus: { reg14: 14, ovi14: 7, reg5: 12, ovi5: 6 },
}

// Etichette leggibili per i 4 profili (usate nel selettore).
export const VARIANTS = [
  { key: 'reg14', label: 'Regular · Lv 1-4' },
  { key: 'ovi14', label: 'Ovi+ · Lv 1-4' },
  { key: 'reg5',  label: 'Regular · Lv 5' },
  { key: 'ovi5',  label: 'Ovi+ · Lv 5' },
]

// Ritorna le ore/turno per specie+variante, o null se non disponibile.
export function hoursPerTurn(species, variant) {
  const row = SPECIES_HOURS[species]
  if (!row) return null
  const h = row[variant]
  return typeof h === 'number' ? h : null
}

// Elenco specie disponibili (ordinato), per popolare il dropdown.
export const SPECIES_LIST = Object.keys(SPECIES_HOURS).sort()
