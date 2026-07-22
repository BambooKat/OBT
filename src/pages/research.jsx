// src/pages/research.jsx
// Livelli di ricerca per specie + calcolo del cooldown effettivo.
//
// In OviPets il cooldown di accoppiamento è un dato della specie (uguale per
// tutti), ma il livello 4 della ricerca lo riduce del 10%. Il livello è quindi
// un dato dell'utente: sta in user_species, non in species.

import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'

// unica riduzione nota: livello 4 → -10% sul breeding cooldown.
// (il livello 5 tocca research e hatching time, non l'accoppiamento)
export const RESEARCH_DISCOUNT_LEVEL = 4
export const RESEARCH_DISCOUNT = 0.10

export const effectiveCooldown = (baseHours, level) => {
  if (!baseHours) return null
  return (level ?? 0) >= RESEARCH_DISCOUNT_LEVEL ? baseHours * (1 - RESEARCH_DISCOUNT) : baseHours
}

export const fmtHours = (h) => {
  if (h == null) return '—'
  const tot = Math.round(h * 60)
  const hh = Math.floor(tot / 60), mm = tot % 60
  return mm ? `${hh}h ${mm}m` : `${hh}h`
}

// icona della specie: file in public/species/, fallback <i className="ti ti-paw" style={{ fontSize: size }} />
export const SpeciesIcon = ({ icon, size = 16 }) =>
  icon
    ? <img src={`/species/${icon}`} alt="" style={{ width: size, height: size, flexShrink: 0 }} />
    : <i className="ti ti-paw" style={{ fontSize: size, lineHeight: 1, color: 'var(--ink-soft)' }} />

// chip compatta: icona + sigla + livello
export const LevelChip = ({ species, level }) => (
  <span
    title={`${species.name} — ${fmtHours(effectiveCooldown(species.cooldown_hours, level))}`}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 999, padding: '3px 9px', fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}
  >
    <SpeciesIcon icon={species.icon} size={15} />
    <span style={{ letterSpacing: 0.3 }}>{species.name.slice(0, 3).toUpperCase()}</span>
    <span style={{ color: 'var(--primary)' }}>{level}</span>
  </span>
)

// modal con la tabella completa dei livelli
export function ResearchModal({ open, onClose, species, levels, onChange }) {
  const { t } = useT()
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  const setLevel = async (speciesId, level) => {
    setError('')
    setSaving(speciesId)
    onChange({ ...levels, [speciesId]: level })
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('user_species').upsert(
      { user_id: user.id, species_id: speciesId, research_level: level },
      { onConflict: 'user_id,species_id' }
    )
    if (error) setError(t('research.saveError'))
    setSaving(null)
  }

  const known = species.filter(s => levels[s.id] > 1)
  const rest = species.filter(s => !(levels[s.id] > 1))

  const Row = ({ s }) => {
    const lvl = levels[s.id] ?? 0
    const eff = effectiveCooldown(s.cooldown_hours, lvl)
    const discounted = s.cooldown_hours && eff !== s.cooldown_hours
    return (
      <tr>
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <SpeciesIcon icon={s.icon} />
            <strong>{s.name}</strong>
          </span>
        </td>
        <td style={{ color: 'var(--ink-soft)' }}>{s.cooldown_hours ? `${s.cooldown_hours}h` : '—'}</td>
        <td>
          <select className="obt-select" value={lvl} disabled={saving === s.id}
            onChange={e => setLevel(s.id, parseInt(e.target.value))}
            style={{ width: 'auto', minWidth: 66 }}>
            {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </td>
        <td style={{ fontWeight: 700, color: discounted ? 'var(--good-text)' : 'var(--ink)' }}>
          {fmtHours(eff)}
          {discounted && <span style={{ fontSize: 11, marginLeft: 5 }}>−10%</span>}
        </td>
      </tr>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={t('research.title')} size="lg">
      <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>{t('research.hint')}</p>
      {error && <div className="obt-alert obt-alert--error" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ overflowX: 'auto', maxHeight: '55vh' }}>
        <table className="obt-table">
          <thead>
            <tr>
              <th>{t('research.species')}</th>
              <th>{t('research.base')}</th>
              <th>{t('research.level')}</th>
              <th>{t('research.effective')}</th>
            </tr>
          </thead>
          <tbody>
            {known.map(s => <Row key={s.id} s={s} />)}
            {known.length > 0 && rest.length > 0 && (
              <tr><td colSpan={4} style={{ padding: '10px 0 2px' }}>
                <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700 }}>{t('research.others')}</span>
              </td></tr>
            )}
            {rest.map(s => <Row key={s.id} s={s} />)}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// hook: carica specie + livelli dell'utente
export function useResearch() {
  const [species, setSpecies] = useState([])
  const [levels, setLevels] = useState({})

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: sp } = await supabase.from('species')
      .select('id, name, cooldown_hours, icon').order('name', { ascending: true })
    setSpecies(sp || [])
    const { data: us } = await supabase.from('user_species')
      .select('species_id, research_level').eq('user_id', user.id)
    const map = {}
    ;(us || []).forEach(r => { map[r.species_id] = r.research_level })
    setLevels(map)
  })() }, [])

  return { species, levels, setLevels }
}
