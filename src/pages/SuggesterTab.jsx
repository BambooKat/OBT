// src/pages/SuggesterTab.jsx
// Tab "Suggeritore" — SOLO dati reali dei round, nessuna previsione.
// Riusa la stessa metrica di ProjectPage: distanza RGB per-slot verso il target,
// così i numeri combaciano sempre con quelli mostrati nelle altre tabelle.

import { useT } from '../i18n'

const SLOTS = ['eyes', 'body1', 'body2', 'extra1', 'extra2']

const hexToRgb = (hex) => {
  if (!hex) return null
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const colorDist = (h1, h2) => {
  const a = hexToRgb(h1), b = hexToRgb(h2)
  if (!a || !b) return null
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}
const totalDist = (pet, project) => {
  if (!pet || !project) return null
  let total = 0, count = 0
  for (const s of SLOTS) {
    const d = colorDist(pet[s], project['target_' + s])
    if (d !== null) { total += d; count++ }
  }
  return count > 0 ? total : null
}
const distClass = (d) =>
  d == null ? '' : d < 60 ? 'obt-dist-pill--good' : d < 130 ? 'obt-dist-pill--mid' : 'obt-dist-pill--bad'

const petLabel = (pet) => (pet?.letter ? `${pet.letter} — ${pet.code}` : pet?.code || '?')

const Pill = ({ d }) =>
  d == null ? <span>-</span> : <span className={`obt-dist-pill ${distClass(d)}`}>{Math.round(d)}</span>

// --- Coppie che hanno GIA' prodotto figli: miglior figlio, media, guadagno ---
function computePairs(pets, project) {
  const byId = new Map(pets.map((p) => [p.id, p]))
  const groups = new Map()
  for (const c of pets) {
    if (!c.mother_id || !c.father_id) continue
    const key = c.mother_id + '|' + c.father_id
    if (!groups.has(key)) {
      groups.set(key, { mother: byId.get(c.mother_id), father: byId.get(c.father_id), children: [] })
    }
    groups.get(key).children.push(c)
  }
  const rows = []
  for (const g of groups.values()) {
    if (!g.mother || !g.father) continue
    const md = totalDist(g.mother, project), fd = totalDist(g.father, project)
    const mid = md != null && fd != null ? (md + fd) / 2 : null
    const cd = g.children.map((c) => totalDist(c, project)).filter((d) => d != null)
    if (!cd.length) continue
    const avg = cd.reduce((a, b) => a + b, 0) / cd.length
    rows.push({
      mother: g.mother, father: g.father, n: cd.length,
      best: Math.min(...cd), avg, mid, gain: mid != null ? mid - avg : null,
    })
  }
  return rows.sort((a, b) => a.best - b.best)
}

// --- Riproduttori "elevatori": media distanza figli per ogni genitore ---
function computeBreeders(pets, project) {
  const byId = new Map(pets.map((p) => [p.id, p]))
  const acc = new Map()
  for (const c of pets) {
    const d = totalDist(c, project)
    if (d == null) continue
    for (const pid of [c.mother_id, c.father_id]) {
      if (!pid) continue
      if (!acc.has(pid)) acc.set(pid, [])
      acc.get(pid).push(d)
    }
  }
  const rows = []
  for (const [pid, ds] of acc) {
    const p = byId.get(pid)
    if (!p) continue
    rows.push({
      pet: p, own: totalDist(p, project),
      avg: ds.reduce((a, b) => a + b, 0) / ds.length,
      best: Math.min(...ds), n: ds.length,
    })
  }
  return rows.sort((a, b) => a.avg - b.avg)
}

export default function SuggesterTab({ pets, project }) {
  const { t } = useT()
  const pairs = computePairs(pets, project)
  const breeders = computeBreeders(pets, project)

  return (
    <>
      {/* Coppie testate */}
      <div className="obt-panel">
        <h3 style={{ marginBottom: 6 }}>{t('project.suggester.pairsTitle')}</h3>
        <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
          {t('project.suggester.pairsHint')}
        </p>
        {pairs.length === 0 ? (
          <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
            {t('project.suggester.empty')}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="obt-table">
              <thead>
                <tr>
                  <th>{t('project.pairs.mother')}</th>
                  <th>{t('project.pairs.father')}</th>
                  <th>{t('project.suggester.nChildren')}</th>
                  <th>{t('project.suggester.bestChild')}</th>
                  <th>{t('project.suggester.avgChild')}</th>
                  <th>{t('project.suggester.midParent')}</th>
                  <th>{t('project.suggester.gain')}</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((r, i) => (
                  <tr key={i}>
                    <td>{petLabel(r.mother)}</td>
                    <td>{petLabel(r.father)}</td>
                    <td>{r.n}</td>
                    <td><Pill d={r.best} /></td>
                    <td><Pill d={r.avg} /></td>
                    <td>{r.mid != null ? Math.round(r.mid) : '-'}</td>
                    <td style={{ fontWeight: 700, color: r.gain > 0 ? 'var(--primary)' : 'var(--muted)' }}>
                      {r.gain != null ? (r.gain > 0 ? '+' : '') + Math.round(r.gain) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Riproduttori elevatori */}
      <div className="obt-panel">
        <h3 style={{ marginBottom: 6 }}>{t('project.suggester.breedersTitle')}</h3>
        <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
          {t('project.suggester.breedersHint')}
        </p>
        {breeders.length === 0 ? (
          <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
            {t('project.suggester.empty')}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="obt-table">
              <thead>
                <tr>
                  <th>{t('project.table.code')}</th>
                  <th>{t('project.table.sex')}</th>
                  <th>{t('project.suggester.ownDist')}</th>
                  <th>{t('project.suggester.avgChild')}</th>
                  <th>{t('project.suggester.bestChild')}</th>
                  <th>{t('project.suggester.nChildren')}</th>
                </tr>
              </thead>
              <tbody>
                {breeders.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.pet.code}</strong></td>
                    <td>{r.pet.sex}</td>
                    <td><Pill d={r.own} /></td>
                    <td><Pill d={r.avg} /></td>
                    <td><Pill d={r.best} /></td>
                    <td>{r.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}