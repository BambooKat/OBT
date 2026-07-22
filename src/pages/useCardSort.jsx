// src/pages/useCardSort.jsx
// Ordinamento delle card (dashboard e project dashboard).
// Tre modalità: recenti / alfabetico / personalizzato.
// Il drag&drop è attivo SOLO in modalità personalizzato, e solo per il proprietario.
// La modalità scelta è per-lista e vive in localStorage; l'ordine personalizzato
// vive su DB nella colonna sort_order (projects.sort_order / lines.sort_order).

import { useState, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'

export const SORT_MODES = ['recent', 'alpha', 'custom']

const readMode = (listKey) => {
  try {
    const v = localStorage.getItem('obt.sort.' + listKey)
    return SORT_MODES.includes(v) ? v : 'recent'
  } catch { return 'recent' }
}

const sortItems = (items, mode) => {
  const arr = [...items]
  if (mode === 'alpha') {
    return arr.sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  }
  if (mode === 'custom') {
    return arr.sort((a, b) => {
      const ao = a.sort_order, bo = b.sort_order
      // chi non ha ancora un ordine personalizzato finisce in fondo, per data
      if (ao == null && bo == null) return String(b.created_at || '').localeCompare(String(a.created_at || ''))
      if (ao == null) return 1
      if (bo == null) return -1
      return ao - bo
    })
  }
  // recent
  return arr.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

/**
 * @param listKey  chiave univoca della lista (per ricordare la modalità)
 * @param items    array di record con id, name, created_at, sort_order
 * @param table    'projects' | 'lines' — dove salvare l'ordine personalizzato
 * @param onReorder callback(itemsAggiornati) per riscrivere lo state del chiamante
 * @param canReorder se false il drag è disattivato (visitatore non proprietario)
 */
export function useCardSort({ listKey, items, table, onReorder, canReorder = true }) {
  const [mode, setModeState] = useState(() => readMode(listKey))
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const savingRef = useRef(false)

  const setMode = (m) => {
    setModeState(m)
    try { localStorage.setItem('obt.sort.' + listKey, m) } catch { /* storage non disponibile */ }
  }

  const sorted = useMemo(() => sortItems(items, mode), [items, mode])
  const dragEnabled = mode === 'custom' && canReorder

  const persist = async (ordered) => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      // riscrive sort_order = posizione per tutta la lista, così non restano buchi
      await Promise.all(ordered.map((it, i) =>
        supabase.from(table).update({ sort_order: i }).eq('id', it.id)
      ))
    } finally {
      savingRef.current = false
    }
  }

  const move = (fromId, toId) => {
    if (fromId === toId) return
    const list = [...sorted]
    const from = list.findIndex(x => x.id === fromId)
    const to = list.findIndex(x => x.id === toId)
    if (from < 0 || to < 0) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    const withOrder = list.map((it, i) => ({ ...it, sort_order: i }))
    onReorder?.(withOrder)
    persist(withOrder)
  }

  // props da spalmare sulla card
  const dragProps = (item) => {
    if (!dragEnabled) return {}
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragId(item.id)
        e.dataTransfer.effectAllowed = 'move'
        // Firefox richiede che si scriva qualcosa nel dataTransfer
        try { e.dataTransfer.setData('text/plain', item.id) } catch { /* ignore */ }
      },
      onDragOver: (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (overId !== item.id) setOverId(item.id)
      },
      onDragLeave: () => { if (overId === item.id) setOverId(null) },
      onDrop: (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (dragId) move(dragId, item.id)
        setDragId(null)
        setOverId(null)
      },
      onDragEnd: () => { setDragId(null); setOverId(null) },
      style: {
        cursor: 'grab',
        opacity: dragId === item.id ? 0.4 : 1,
        outline: overId === item.id && dragId !== item.id ? '2px dashed var(--primary)' : undefined,
        outlineOffset: 3,
      },
      // in modalità drag il click di navigazione darebbe fastidio: lo blocchiamo
      // solo se si è appena trascinato qualcosa
      onClickCapture: (e) => { if (dragId) { e.preventDefault(); e.stopPropagation() } },
    }
  }

  return { mode, setMode, sorted, dragEnabled, dragProps }
}

// --- selettore di ordinamento ---
export function SortControl({ mode, setMode, dragEnabled }) {
  const { t } = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <label className="obt-text-soft" style={{ fontSize: 11, fontWeight: 700 }}>
        {t('sort.label')}
      </label>
      <select
        className="obt-select"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ width: 'auto', minWidth: 118, fontSize: 12, padding: '5px 26px 5px 10px', height: 'auto' }}
      >
        <option value="recent">{t('sort.recent')}</option>
        <option value="alpha">{t('sort.alpha')}</option>
        <option value="custom">{t('sort.custom')}</option>
      </select>
      {dragEnabled && (
        <span className="obt-text-soft" style={{ fontSize: 11 }}>{t('sort.dragHint')}</span>
      )}
    </div>
  )
}
