// src/pages/FavoritesCompare.jsx
// Confronto fianco a fianco dei pet segnati come preferiti (pets.favorite).
// Righe = slot colore, colonne = Target + un pet per colonna. Ogni cella mostra
// lo swatch e la distanza dal target su quello slot; ultima riga = distanza totale.
// Nessun dato di gioco nuovo: legge solo il flag favorite e riusa la metrica di petUtils.

import { useMemo } from 'react'
import { useT } from '../i18n'
import { slotsOf, colorDist, totalDist, Pill } from './petUtils'

const Swatch = ({ hex }) => {
  if (!hex) return <span style={{ color: 'var(--ink-soft)' }}>-</span>
  const clean = (hex.startsWith('#') ? hex : `#${hex}`).toUpperCase()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: 16, height: 16, borderRadius: 4,
        background: clean, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0,
      }} />
      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{clean.slice(1)}</span>
    </span>
  )
}

export default function FavoritesCompare({ pets, project }) {
  const { t } = useT()
  const slots = slotsOf(project)
  const slotLabel = (key) => t('project.slot.' + key)
  const target = project?.target_colors || {}

  // ordinati per generazione poi per nome: i preferiti restano raggruppati per gen,
  // così "i migliori di una generazione" stanno vicini
  const favs = useMemo(
    () => pets
      .filter(p => p.favorite)
      .sort((a, b) => (a.generation - b.generation) || String(a.name).localeCompare(String(b.name))),
    [pets]
  )

  return (
    <div className="obt-panel">
      <h3 style={{ marginBottom: 6 }}>{t('project.favorites.title')}</h3>
      <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
        {t('project.favorites.hint')}
      </p>

      {favs.length === 0 ? (
        <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
          {t('project.favorites.empty')}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="obt-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}></th>
                <th style={{ whiteSpace: 'nowrap' }}>
                  <i className="ti ti-target-arrow" /> {t('project.favorites.colTarget')}
                </th>
                {favs.map(p => (
                  <th key={p.id} style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 800 }}>★ {p.name}</div>
                    <div className="obt-text-soft" style={{ fontSize: 11, fontWeight: 600 }}>
                      G{p.generation} · {p.sex}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(s => (
                <tr key={s}>
                  <td><strong>{slotLabel(s)}</strong></td>
                  <td><Swatch hex={target[s]} /></td>
                  {favs.map(p => (
                    <td key={p.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Swatch hex={(p.colors || {})[s]} />
                        <Pill d={colorDist((p.colors || {})[s], target[s])} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--line)' }}>
                <td><strong>{t('project.favorites.total')}</strong></td>
                <td className="obt-text-soft" style={{ fontSize: 12 }}>—</td>
                {favs.map(p => (
                  <td key={p.id}><Pill d={totalDist(p, project)} /></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
