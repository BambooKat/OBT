// src/pages/PetPicker.jsx
// Selettore pet scrivibile + a tendina, con le opzioni raggruppate per
// generazione. Sostituisce i <select> nativi quando la lista di pet diventa
// lunga (G2+): si può digitare per filtrare e le voci sono raggruppate per
// generazione con intestazioni apri/chiudi (chiuse di default).
//
// La lista è renderizzata via portal su document.body e posizionata con
// coordinate viewport (position: fixed). Necessario perché lo .obt-shell usa
// overflow:hidden e l'overlay del modal usa backdrop-filter: entrambi
// ritaglierebbero / ri-ancorerebbero un dropdown posizionato dentro l'albero
// del componente. Il portal lo tira fuori da quei contesti.

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { petLabel } from './petUtils'

const genOf = (p) => p.generation ?? 0

export default function PetPicker({
  pets,
  value,
  onChange,
  placeholder,
  showSex = false,
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const [coords, setCoords] = useState(null)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const selected = pets.find(p => p.id === value) || null
  const searching = query.trim().length > 0

  // Posiziona la lista in coordinate viewport. Ricalcola su qualsiasi scroll
  // (capture=true intercetta anche lo scroll interno di overlay/modal) e su
  // resize, finché è aperta.
  useEffect(() => {
    if (!open) return
    const place = () => {
      const el = inputRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const below = window.innerHeight - r.bottom
      const maxH = Math.min(320, Math.max(160, below - 16))
      setCoords({ left: r.left, top: r.bottom + 4, width: r.width, maxH })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && rootRef.current.contains(e.target)) return
      if (e.target.closest && e.target.closest('.obt-picker-list')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? pets.filter(p => petLabel(p).toLowerCase().includes(q))
      : pets
    const byGen = new Map()
    for (const p of filtered) {
      const g = genOf(p)
      if (!byGen.has(g)) byGen.set(g, [])
      byGen.get(g).push(p)
    }
    return [...byGen.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([g, list]) => ({
        gen: g,
        label: g === 0 ? t('project.picker.founders') : `G${g}`,
        pets: list.sort((a, b) =>
          String(petLabel(a)).localeCompare(String(petLabel(b)))
        ),
      }))
  }, [pets, query, t])

  // Un gruppo è espanso se stai cercando (auto-espansione) o se l'hai aperto a
  // mano. Chiusi di default.
  const isOpenGroup = (g) => searching || openGroups.has(g)

  const toggleGroup = (g) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })

  // lista piatta (solo gruppi visibili) per la navigazione con le frecce
  const flat = useMemo(
    () => groups.filter(gr => isOpenGroup(gr.gen)).flatMap(gr => gr.pets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, openGroups, searching]
  )

  const commit = (p) => {
    onChange(p ? p.id : '')
    setOpen(false)
    setQuery('')
    setActive(-1)
  }

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && flat[active]) commit(flat[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const list = open && coords && (
    <div
      className="obt-picker-list"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top,
        width: coords.width,
        maxHeight: coords.maxH,
      }}
    >
      {groups.length === 0 && (
        <div className="obt-picker-empty">{t('project.picker.empty')}</div>
      )}
      {groups.map(group => {
        const expanded = isOpenGroup(group.gen)
        return (
          <div key={group.gen}>
            <button
              type="button"
              className="obt-picker-group"
              onMouseDown={(e) => { e.preventDefault(); toggleGroup(group.gen) }}
              aria-expanded={expanded}
            >
              <span className="obt-picker-caret">{expanded ? '▾' : '▸'}</span>
              <span>{group.label}</span>
              <span className="obt-picker-count">{group.pets.length}</span>
            </button>
            {expanded && group.pets.map(p => {
              const idx = flat.indexOf(p)
              return (
                <div
                  key={p.id}
                  className={
                    'obt-picker-option' +
                    (p.id === value ? ' is-selected' : '') +
                    (idx === active ? ' is-active' : '')
                  }
                  onMouseEnter={() => setActive(idx)}
                  onMouseDown={(e) => { e.preventDefault(); commit(p) }}
                >
                  {showSex && p.sex ? `${p.sex} · ` : ''}{petLabel(p)}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="obt-picker" ref={rootRef} onKeyDown={onKeyDown}>
      <input
        ref={inputRef}
        className="obt-select obt-picker-input"
        type="text"
        value={open ? query : (selected ? petLabel(selected) : '')}
        placeholder={selected ? '' : (placeholder || t('project.inspector.choose'))}
        onFocus={() => { setOpen(true); setActive(-1) }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1) }}
      />
      {selected && !open && (
        <button
          type="button"
          className="obt-picker-clear"
          onClick={() => commit(null)}
          aria-label="clear"
        >×</button>
      )}
      {list && createPortal(list, document.body)}
    </div>
  )
}
