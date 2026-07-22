// Helper condivisi tra ProjectPage, PairGrid, InspectorTab e SuggesterTab.
// Un solo posto per la metrica distanza: se cambiano le soglie, cambiano ovunque.

// data odierna in formato YYYY-MM-DD usando l'ora locale (non UTC)
export const todayISO = () => new Date().toLocaleDateString('sv-SE')

export const normalizeHex = (raw) => {
  if (!raw) return null
  const h = String(raw).trim().replace(/#/g, '').toUpperCase()
  return /^[0-9A-F]{6}$/.test(h) ? '#' + h : null
}

export const petLabel = (pet) => (pet?.code ? `${pet.code} — ${pet.name}` : pet?.name || '?')

export const DEFAULT_SLOTS = ['eyes', 'body1', 'body2', 'extra1', 'extra2']

export const slotsOf = (project) =>
  project?.species?.color_slots?.length ? project.species.color_slots : DEFAULT_SLOTS

export const hexToRgb = (hex) => {
  if (!hex) return null
  const h = String(hex).trim().replace(/#/g, '')
  if (h.length !== 6) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const colorDist = (h1, h2) => {
  const a = hexToRgb(h1), b = hexToRgb(h2)
  if (!a || !b) return null
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

export const totalDist = (pet, project) => {
  if (!pet || !project) return null
  const target = project.target_colors || {}
  const colors = pet.colors || {}
  let total = 0, count = 0
  for (const s of slotsOf(project)) {
    const d = colorDist(colors[s], target[s])
    if (d !== null) { total += d; count++ }
  }
  return count > 0 ? total : null
}

export const distClass = (d) =>
  d == null ? '' : d < 60 ? 'obt-dist-pill--good' : d < 130 ? 'obt-dist-pill--mid' : 'obt-dist-pill--bad'

export const Pill = ({ d }) =>
  d == null ? <span style={{ color: 'var(--ink-soft)' }}>-</span>
    : <span className={`obt-dist-pill ${distClass(d)}`}>{Math.round(d)}</span>

// ---- export CSV ----
// Separatore ';' e BOM UTF-8: così Excel in locale italiano apre il file in
// colonne senza chiedere niente, e gli accenti non si rompono.
const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const downloadCsv = (rows, filename) => {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const body = rows.map(r => headers.map(h => csvCell(r[h])).join(';'))
  const text = '\uFEFF' + [headers.join(';'), ...body].join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Trasforma i pet in righe piatte pronte per il CSV.
export const petsToRows = (list, { slots, project, petsById = {}, petMutationIds = {}, targetMutationIds = [] }) => {
  const target = project?.target_colors || {}
  return list.map(p => {
    const row = {
      nome: p.name || '',
      sigla: p.code || '',
      sesso: p.sex || '',
      generazione: p.generation ?? '',
      madre: petsById[p.mother_id]?.name || '',
      padre: petsById[p.father_id]?.name || '',
    }
    for (const s of slots) {
      row[s] = (p.colors || {})[s] || ''
      const d = colorDist((p.colors || {})[s], target[s])
      row[s + '_dist'] = d == null ? '' : Math.round(d)
    }
    const ids = petMutationIds[p.id] || []
    row.mutazioni_tot = ids.length
    row.mutazioni_target = targetMutationIds.length
      ? ids.filter(i => targetMutationIds.includes(i)).length
      : ''
    const td = totalDist(p, project)
    row.distanza = td == null ? '' : Math.round(td)
    row.note = p.notes || ''
    return row
  })
}

// ---- floor di una coppia (stessa logica dell'Ispettore) ----
// Per ogni canale RGB: se il target sta fra i due genitori, quel canale è
// raggiungibile (gap 0); altrimenti resta la distanza dal bordo più vicino.
export const analyseSlot = (motherHex, fatherHex, targetHex) => {
  const m = hexToRgb(motherHex), f = hexToRgb(fatherHex), t = hexToRgb(targetHex)
  if (!m || !f || !t) return null
  const channels = ['R', 'G', 'B'].map((name, i) => {
    const lo = Math.min(m[i], f[i]), hi = Math.max(m[i], f[i])
    const inRange = t[i] >= lo && t[i] <= hi
    const gap = inRange ? 0 : (t[i] < lo ? lo - t[i] : t[i] - hi)
    return { name, mother: m[i], father: f[i], target: t[i], lo, hi, inRange, gap }
  })
  return {
    channels,
    floor: Math.sqrt(channels.reduce((a, c) => a + c.gap ** 2, 0)),
    reachableChannels: channels.filter(c => c.inRange).length,
    fullyReachable: channels.every(c => c.inRange),
  }
}

export const pairFloor = (mother, father, project) => {
  if (!mother || !father || !project) return null
  const target = project.target_colors || {}
  let floor = 0, valid = 0
  for (const s of slotsOf(project)) {
    const d = analyseSlot((mother.colors || {})[s], (father.colors || {})[s], target[s])
    if (!d) continue
    valid++; floor += d.floor
  }
  return valid ? floor : null
}
