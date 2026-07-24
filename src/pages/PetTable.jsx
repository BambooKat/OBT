import { useState, useEffect, useRef } from 'react'

// Cella colore. Due modalità:
//  - default (tabella): barretta colorata + hex sotto, così si legge il colore
//    a colpo d'occhio E il valore esatto senza passare dal tooltip.
//  - showHex (form): quadrotto classico con l'hex accanto.
// In entrambi i casi il click copia il valore negli appunti.
const ColorCell = ({ hex, showHex = false, size = 20 }) => {
  const [copied, setCopied] = useState(false)
  if (!hex) return <span style={{ color: 'var(--ink-soft)' }}>-</span>
  const clean = (hex.startsWith('#') ? hex : `#${hex}`).toUpperCase()

  const copy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(clean)
      setCopied(true)
      setTimeout(() => setCopied(false), 900)
    } catch { /* clipboard negata: pazienza, resta il tooltip */ }
  }

  const onKey = e => { if (e.key === 'Enter' || e.key === ' ') copy(e) }

  if (showHex) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          className="obt-swatch"
          onClick={copy}
          title={copied ? `${clean} ✓` : clean}
          role="button"
          tabIndex={0}
          onKeyDown={onKey}
          style={{
            display: 'inline-block', width: size, height: size, borderRadius: 5,
            background: clean, flexShrink: 0, cursor: 'pointer',
            border: copied ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.18)',
          }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{clean}</span>
      </span>
    )
  }

  // la barra non ha larghezza propria: la prende dall'hex sotto, così restano
  // sempre allineate qualunque font finisca per usare il browser
  return (
    <span
      onClick={copy}
      title={copied ? `${clean} ✓` : clean}
      role="button"
      tabIndex={0}
      onKeyDown={onKey}
      style={{ display: 'inline-block', cursor: 'pointer', lineHeight: 1 }}
    >
      <span style={{
        display: 'block', height: 15, borderRadius: 4, background: clean,
        marginBottom: 3,
        border: copied ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.18)',
      }} />
      <span style={{
        display: 'block', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
        color: 'var(--ink-soft)', letterSpacing: '-0.02em',
      }}>{clean.slice(1)}</span>
    </span>
  )
}

const MutCell = ({ ids = [], targetIds = [] }) => {
  const total = ids.length
  if (total === 0) return <span style={{ color: 'var(--muted)' }}>0v</span>
  if (targetIds.length === 0) return <span>{total}v</span>

  const match = ids.filter(i => targetIds.includes(i)).length
  const cls = match === targetIds.length ? 'good' : match > 0 ? 'mid' : 'bad'
  return (
    <span
      className={`obt-dist-pill obt-dist-pill--${cls}`}
      title={`${match}/${targetIds.length} target · ${total} totali`}
    >
      {match}/{total}v
    </span>
  )
}

// Cella SEX modificabile in linea: niente modal, niente scroll perso.
function InlineSexCell({ pet, onCommit }) {
  const [busy, setBusy] = useState(false)
  const handle = async (e) => {
    const next = e.target.value
    if (next === pet.sex) return
    setBusy(true)
    await onCommit(pet.id, { sex: next })
    setBusy(false)
  }
  return (
    <select
      className="obt-select obt-inline-cell"
      value={pet.sex || 'ND'}
      disabled={busy}
      onChange={handle}
      style={{ padding: '2px 4px', fontSize: 13, minWidth: 58, opacity: busy ? 0.5 : 1 }}
    >
      <option value="M">M</option>
      <option value="F">F</option>
      <option value="ND">ND</option>
    </select>
  )
}

// Cella CODE modificabile in linea: commit su blur o Enter, Esc annulla.
function InlineCodeCell({ pet, onCommit }) {
  const [draft, setDraft] = useState(pet.code || '')
  const [busy, setBusy] = useState(false)
  const committed = useRef(pet.code || '')

  // se il valore cambia da fuori (reload, altro edit) riallinea la bozza
  useEffect(() => {
    if ((pet.code || '') !== committed.current) {
      committed.current = pet.code || ''
      setDraft(pet.code || '')
    }
  }, [pet.code])

  const commit = async () => {
    const next = draft.trim()
    if (next === (committed.current || '')) return
    setBusy(true)
    const ok = await onCommit(pet.id, { code: next || null })
    setBusy(false)
    if (ok) committed.current = next
    else setDraft(committed.current || '')
  }

  return (
    <input
      className="obt-input obt-inline-cell"
      value={draft}
      disabled={busy}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
        if (e.key === 'Escape') { setDraft(committed.current || ''); e.currentTarget.blur() }
      }}
      style={{ padding: '2px 6px', fontSize: 13, width: 70, opacity: busy ? 0.5 : 1 }}
    />
  )
}


// Cella GRUPPO: picker con i gruppi già esistenti nella linea + voce "nuovo".
// Il picker evita i typo che con testo libero creerebbero gruppi-fantasma.
function InlineGroupCell({ pet, groupOptions, onCommit, t }) {
  const [busy, setBusy] = useState(false)
  const value = pet.group_tag || ''
  const handle = async (e) => {
    const v = e.target.value
    if (v === '__new__') {
      const name = window.prompt(t('project.group.newPrompt'))
      const clean = (name || '').trim()
      if (!clean) return
      setBusy(true); await onCommit(pet.id, { group_tag: clean }); setBusy(false)
      return
    }
    if (v === value) return
    setBusy(true)
    await onCommit(pet.id, { group_tag: v || null })
    setBusy(false)
  }
  const opts = (!value || groupOptions.includes(value)) ? groupOptions : [value, ...groupOptions]
  return (
    <select
      className="obt-select obt-inline-cell"
      value={value}
      disabled={busy}
      onChange={handle}
      style={{ padding: '2px 4px', fontSize: 13, minWidth: 96, opacity: busy ? 0.5 : 1 }}
    >
      <option value="">{t('project.group.none')}</option>
      {opts.map(g => <option key={g} value={g}>{g}</option>)}
      <option value="__new__">{t('project.group.new')}</option>
    </select>
  )
}


function PetTable({ list, title, ctx }) {
  const {
    petSort, setPetSort, slots, slotLabel, totalDist, colorDist, project,
    petMutationIds, targetMutationIds, isOwner, handleEditPet, handleDeletePet, handleDeleteMany, t, distClass,
    updatePetField, groupOptions = [],
  } = ctx

    // --- selezione multipla (mass delete) ---
    const [selected, setSelected] = useState(() => new Set())
    // se la lista cambia (reload dopo delete/edit) togli dalla selezione gli id spariti
    useEffect(() => {
      setSelected(prev => {
        if (prev.size === 0) return prev
        const live = new Set(list.map(p => p.id))
        const next = new Set()
        let changed = false
        for (const id of prev) { if (live.has(id)) next.add(id); else changed = true }
        return changed ? next : prev
      })
    }, [list])

    const sort = petSort[title] || { key: null, dir: 1 }
    const applySort = (key) =>
      setPetSort(prev => {
        const cur = prev[title] || { key: null, dir: 1 }
        const next = cur.key === key ? { key, dir: -cur.dir } : { key, dir: 1 }
        return { ...prev, [title]: next }
      })
    const slotKeys = slots
    const sortVal = (pet, key) => {
      if (key === 'gen') return pet.generation ?? 0
      if (key === 'favorite') return pet.favorite ? 1 : 0
      if (key === 'mut') {
        const ids = petMutationIds[pet.id] || []
        return targetMutationIds.length ? ids.filter(i => targetMutationIds.includes(i)).length : ids.length
      }
      if (key === 'distance') return totalDist(pet)
      if (slotKeys.includes(key)) return colorDist((pet.colors || {})[key], (project.target_colors || {})[key])
      return (pet[key] ?? '').toString().toLowerCase()
    }
    const sorted = sort.key
      ? [...list].sort((a, b) => {
          const va = sortVal(a, sort.key), vb = sortVal(b, sort.key)
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          if (va < vb) return -sort.dir
          if (va > vb) return sort.dir
          return 0
        })
      : list

    // --- helper selezione, calcolati sull'ordine mostrato ---
    const visibleIds = sorted.map(p => p.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
    const someSelected = visibleIds.some(id => selected.has(id))
    const toggleOne = (id) => setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    const toggleAll = () => setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) visibleIds.forEach(id => next.delete(id))
      else visibleIds.forEach(id => next.add(id))
      return next
    })
    const doDeleteSelected = async () => {
      const ids = [...selected]
      await handleDeleteMany(ids)
      setSelected(new Set())
    }

    // stella preferito: toggle per l'owner, indicatore statico per chi guarda
    const StarCell = ({ pet }) => {
      const on = !!pet.favorite
      if (!isOwner) {
        return <span style={{ color: on ? '#f5b301' : 'var(--line)', fontSize: 15 }} title={on ? t('project.table.favOn') : ''}>{on ? '★' : '☆'}</span>
      }
      return (
        <button
          className="obt-icon-btn"
          onClick={() => updatePetField(pet.id, { favorite: !on })}
          title={on ? t('project.table.favOn') : t('project.table.favOff')}
          style={{ color: on ? '#f5b301' : 'var(--muted)', fontSize: 16, lineHeight: 1 }}
        >{on ? '★' : '☆'}</button>
      )
    }

    const Th = ({ k, children, className }) => (
      <th className={className} onClick={() => applySort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} title={t('project.table.sortHint')}>
        {children}
        <span style={{ marginLeft: 4, fontSize: 10, opacity: sort.key === k ? 0.9 : 0.25 }}>
          {sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}
        </span>
      </th>
    )
    return (
      <div className="obt-panel">
        <h3 style={{ marginBottom: 14 }}>{title}</h3>
        {list.length === 0 ? (
          <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>{t('common.none')}</p>
        ) : (
          <>
            {isOwner && selected.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                marginBottom: 12, padding: '8px 12px',
                border: '2px solid var(--primary)', borderRadius: 'var(--radius)', background: 'var(--bg)',
              }}>
                <strong style={{ fontSize: 13 }}>{t('project.mass.selected', { n: selected.size })}</strong>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="obt-btn obt-btn--danger obt-btn--sm" onClick={doDeleteSelected}>
                    <i className="ti ti-trash" /> {t('project.mass.deleteSelected')}
                  </button>
                  <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setSelected(new Set())}>
                    {t('project.mass.clear')}
                  </button>
                </span>
              </div>
            )}
          <div style={{ overflowX: 'auto' }}>
            <table className="obt-table">
              <thead>
                <tr>
                  {isOwner && (
                    <th style={{ width: 28 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = !allSelected && someSelected }}
                        onChange={toggleAll}
                        title={t('project.mass.selectAll')}
                        style={{ width: 15, height: 15, cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <Th k="favorite">{t('project.table.fav')}</Th>
                  <Th k="name">{t('project.table.name')}</Th>
                  <Th k="sex">{t('project.table.sex')}</Th>
                  <Th k="code">{t('project.table.code')}</Th>
                  <Th k="group_tag">{t('project.table.group')}</Th>
                  <Th k="gen">{t('project.table.gen')}</Th>
                  {slots.map(s => <Th key={s} k={s} className="obt-td-swatch">{slotLabel(s)}</Th>)}
                  <Th k="mut">{t('project.table.mut')}{targetMutationIds.length > 0 && ` (${targetMutationIds.length})`}</Th>
                  <Th k="distance">{t('project.table.distance')}</Th>
                  <Th k="notes">{t('project.table.notes')}</Th>
                  {isOwner && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map(pet => {
                  const d = totalDist(pet)
                  return (
                    <tr key={pet.id} style={{ background: selected.has(pet.id) ? 'var(--bg)' : undefined }}>
                      {isOwner && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(pet.id)}
                            onChange={() => toggleOne(pet.id)}
                            style={{ width: 15, height: 15, cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td><StarCell pet={pet} /></td>
                      <td><strong>{pet.name}</strong></td>
                      <td>{isOwner ? <InlineSexCell pet={pet} onCommit={updatePetField} /> : pet.sex}</td>
                      <td>{isOwner ? <InlineCodeCell pet={pet} onCommit={updatePetField} /> : (pet.code || '-')}</td>
                      <td>{isOwner ? <InlineGroupCell pet={pet} groupOptions={groupOptions} onCommit={updatePetField} t={t} /> : (pet.group_tag || '-')}</td>
                      <td>{pet.generation}</td>
                      {slots.map(s => <td key={s} className="obt-td-swatch"><ColorCell hex={(pet.colors || {})[s]} /></td>)}
                      <td><MutCell ids={petMutationIds[pet.id]} targetIds={targetMutationIds} /></td>
                      <td>{d !== null ? <span className={`obt-dist-pill ${distClass(d)}`}>{Math.round(d)}</span> : '-'}</td>
                      <td>{pet.notes || ''}</td>
                      {isOwner && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="obt-icon-btn" onClick={() => handleEditPet(pet)} title={t('common.edit')}><i className="ti ti-pencil" /></button>
                          <button className="obt-icon-btn obt-icon-btn--danger" onClick={() => handleDeletePet(pet.id)} title={t('common.delete')}><i className="ti ti-trash" /></button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    )
}

export default PetTable
export { ColorCell, MutCell }