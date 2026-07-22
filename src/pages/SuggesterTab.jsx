// src/pages/SuggesterTab.jsx
// "Verifica" (dentro Laboratorio) — SOLO dati reali dei round, nessuna previsione.
// Confronta ciò che le coppie hanno prodotto davvero con il floor che avrebbero
// potuto raggiungere: è l'unica vista che dice se una coppia è stata sfruttata.

import { useState, useMemo } from 'react'
import { useT } from '../i18n'
import { totalDist, petLabel, Pill, pairFloor } from './petUtils'

// Il filtro agisce sui FIGLI: "G1" significa "coppie che hanno prodotto figli G1",
// non "coppie composte da pet G1".
const inGen = (pet, gen) => gen === '' || String(pet.generation ?? 0) === gen

// --- Coppie che hanno GIA' prodotto figli: miglior figlio, media, floor ---
function computePairs(pets, project, gen) {
  const byId = new Map(pets.map((p) => [p.id, p]))
  const groups = new Map()
  for (const c of pets) {
    if (!c.mother_id || !c.father_id) continue
    if (!inGen(c, gen)) continue
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
    const best = Math.min(...cd)
    const floor = pairFloor(g.mother, g.father, project)
    rows.push({
      mother: g.mother, father: g.father, n: cd.length,
      best, avg, mid, floor,
      // quanto il miglior figlio dista dal minimo teorico: piccolo = coppia sfruttata
      overFloor: floor != null ? best - floor : null,
      gain: mid != null ? mid - avg : null,
    })
  }
  return rows.sort((a, b) => a.best - b.best)
}

// --- Riproduttori "elevatori": media distanza figli per ogni genitore ---
function computeBreeders(pets, project, gen) {
  const byId = new Map(pets.map((p) => [p.id, p]))
  const acc = new Map()
  for (const c of pets) {
    if (!inGen(c, gen)) continue
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
  const [gen, setGen] = useState('')

  // solo le generazioni che hanno davvero dei figli: la G0 non compare
  const generations = useMemo(
    () => [...new Set(pets.filter(p => (p.generation ?? 0) > 0).map(p => p.generation))].sort((a, b) => a - b),
    [pets]
  )

  const pairs = useMemo(() => computePairs(pets, project, gen), [pets, project, gen])
  const breeders = useMemo(() => computeBreeders(pets, project, gen), [pets, project, gen])

  const GenFilter = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700 }}>
        {t('project.filter.generation')}
      </span>
      {['', ...generations.map(String)].map(g => (
        <button
          key={g || 'all'}
          onClick={() => setGen(g)}
          style={{
            padding: '4px 12px', borderRadius: 'var(--radius-pill)',
            border: g === gen ? '2px solid var(--primary)' : '2px solid var(--line)',
            background: g === gen ? 'var(--primary)' : 'var(--card)',
            color: g === gen ? '#fff' : 'var(--ink)',
            fontWeight: g === gen ? 700 : 600, fontSize: 12,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {g === '' ? t('project.filter.allGens') : `G${g}`}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {/* Coppie testate */}
      <div className="obt-panel">
        <h3 style={{ marginBottom: 6 }}>{t('project.suggester.pairsTitle')}</h3>
        <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
          {t('project.suggester.pairsHint')}
        </p>
        <GenFilter />
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
                  <th>{t('project.inspector.floor')}</th>
                  <th>{t('project.suggester.overFloor')}</th>
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
                    <td><Pill d={r.floor} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                      {r.overFloor != null ? `+${Math.round(r.overFloor)}` : '-'}
                    </td>
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
                  <th>{t('project.table.name')}</th>
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
                    <td><strong>{r.pet.name}</strong></td>
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
