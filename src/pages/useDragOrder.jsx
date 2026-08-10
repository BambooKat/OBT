// src/pages/useDragOrder.jsx
// Drag&drop minimale per riordinare una lista, persistendo su una colonna
// "position" di una tabella Supabase. Estratto/semplificato da useCardSort:
// qui NON ci sono le modalità recent/alpha, solo il trascinamento manuale.
//
// Uso:
//   const { dragProps } = useDragOrder({ items: groups, table: 'journal_checklist_groups', onReorder: setGroups })
//   ...groups.map(g => <div {...dragProps(g)}>...</div>)

import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

export function useDragOrder({ items, table, onReorder, enabled = true }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const savingRef = useRef(false)

  const persist = async (ordered) => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      await Promise.all(ordered.map((it, i) =>
        supabase.from(table).update({ position: i }).eq('id', it.id)
      ))
    } finally {
      savingRef.current = false
    }
  }

  const move = (fromId, toId) => {
    if (fromId === toId) return
    const list = [...items]
    const from = list.findIndex(x => x.id === fromId)
    const to = list.findIndex(x => x.id === toId)
    if (from < 0 || to < 0) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    const withPos = list.map((it, i) => ({ ...it, position: i }))
    onReorder?.(withPos)
    persist(withPos)
  }

  const dragProps = (item) => {
    if (!enabled) return {}
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragId(item.id)
        e.dataTransfer.effectAllowed = 'move'
        try { e.dataTransfer.setData('text/plain', item.id) } catch { /* ignore */ }
      },
      onDragOver: (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (overId !== item.id) setOverId(item.id)
      },
      onDragLeave: () => { if (overId === item.id) setOverId(null) },
      onDrop: (e) => {
        e.preventDefault(); e.stopPropagation()
        if (dragId) move(dragId, item.id)
        setDragId(null); setOverId(null)
      },
      onDragEnd: () => { setDragId(null); setOverId(null) },
      style: {
        cursor: 'grab',
        opacity: dragId === item.id ? 0.4 : 1,
        outline: overId === item.id && dragId !== item.id ? '2px dashed var(--primary)' : undefined,
        outlineOffset: 2,
      },
    }
  }

  return { dragProps, dragId }
}
