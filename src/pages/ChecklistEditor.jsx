// src/pages/ChecklistEditor.jsx
// Editor checklist a DUE COLONNE (/journal/checklist/:id/edit).
//   Sinistra (~75%): inserimento continuo (voce + modalità persistente +
//     select gruppo, Invio aggiunge e mantiene il focus) + lista voci con edit/del.
//   Destra (~25%): gerarchia gruppi (drag&drop per riordinare) + "+gruppo" +
//     toggle posizione sciolti (in cima / in fondo), salvato per-checklist.
// Scrittura immediata. Solo owner: se non lo sei, rimando alla lettura.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'
import VisibilityToggle from './VisibilityToggle'
import { useConfirm } from './ConfirmDialog'
import { useDragOrder } from './useDragOrder'

const parseTags = (raw) =>
  (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default function ChecklistEditor() {
  const { t } = useT()
  const { checklistId } = useParams()
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()

  const [list, setList] = useState(null)
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notAllowed, setNotAllowed] = useState(false)
  const [error, setError] = useState('')

  // riga di inserimento continuo
  const [draft, setDraft] = useState('')
  const [quickMode, setQuickMode] = useState('single')  // persistente
  const [targetGroup, setTargetGroup] = useState('')     // '' = sciolto
  const inputRef = useRef(null)

  // editor voce esistente
  const [itemForm, setItemForm] = useState(null)
  // selezione multipla (Set di id)
  const [selected, setSelected] = useState(() => new Set())
  // editor dati checklist
  const [showMeta, setShowMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ title: '', description: '', tags: '', visibility: 'private' })
  // nuovo gruppo inline
  const [newGroup, setNewGroup] = useState('')
  const [renameForm, setRenameForm] = useState(null)

  const shareUrl = `${window.location.origin}/journal/checklist/${checklistId}`

  useEffect(() => { load() }, [checklistId])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cl } = await supabase
      .from('journal_checklists').select('*').eq('id', checklistId).maybeSingle()
    if (!cl || !user || cl.owner_id !== user.id) { setNotAllowed(true); setLoading(false); return }
    const [{ data: grs }, { data: its }] = await Promise.all([
      supabase.from('journal_checklist_groups').select('*')
        .eq('checklist_id', checklistId).order('position', { ascending: true }),
      supabase.from('journal_checklist_items').select('*')
        .eq('checklist_id', checklistId).order('position', { ascending: true }),
    ])
    setList(cl); setGroups(grs || []); setItems(its || [])
    setLoading(false)
  }

  const groupDrag = useDragOrder({ items: groups, table: 'journal_checklist_groups', onReorder: setGroups })

  // Riordino voci: onReorder aggiorna il sottoinsieme del gruppo dentro lo stato globale.
  const reorderItemsInGroup = (reordered) => {
    setItems(prev => {
      // reordered = sottoinsieme di UN gruppo, nel nuovo ordine (con position aggiornata).
      // Ricostruiamo l'array globale rispettando quel nuovo ordine, così il .filter()
      // nel render riflette immediatamente lo spostamento (riordino ottimistico).
      const movedIds = new Set(reordered.map(it => it.id))
      const queue = [...reordered]
      return prev.map(it => (movedIds.has(it.id) ? queue.shift() : it))
    })
  }

  // ---- inserimento continuo ----------------------------------------------
  const addDraft = async () => {
    const clean = draft.trim()
    if (!clean) return
    const { data, error } = await supabase.from('journal_checklist_items').insert({
      checklist_id: list.id,
      group_id: targetGroup || null,
      label: clean,
      mode: quickMode,
      position: items.length,
    }).select('*').single()
    if (error) { setError(t('checklist.saveError')); return }
    setItems(prev => [...prev, data])
    setDraft('')
    inputRef.current?.focus()   // il focus resta sulla riga
  }

  // ---- voce esistente ----------------------------------------------------
  const saveItem = async () => {
    if (!itemForm.label.trim()) return
    const { error } = await supabase.from('journal_checklist_items').update({
      group_id: itemForm.group_id || null,
      label: itemForm.label.trim(),
      mode: itemForm.mode,
      notes: itemForm.notes.trim() || null,
    }).eq('id', itemForm.id)
    if (error) { setError(t('checklist.saveError')); return }
    setItemForm(null); load()
  }
  const removeItem = (id) => confirm({
    message: t('checklist.deleteItemConfirm'), danger: true,
    onConfirm: async () => {
      const { error } = await supabase.from('journal_checklist_items').delete().eq('id', id)
      if (error) { setError(t('checklist.saveError')); return }
      setItems(prev => prev.filter(it => it.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    },
  })

  // ---- selezione multipla + azioni bulk ----------------------------------
  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const clearSelection = () => setSelected(new Set())
  const selectedIds = () => [...selected]

  // Sposta le voci selezionate in un gruppo ('' = sciolto). Le accodo in fondo
  // al gruppo di destinazione, ricalcolando le position per quel gruppo.
  const bulkMove = async (groupId) => {
    const ids = selectedIds()
    if (!ids.length) return
    const gid = groupId || null
    const destCount = items.filter(it => (it.group_id || null) === gid && !selected.has(it.id)).length
    let pos = destCount
    const posById = new Map()
    for (const id of ids) posById.set(id, pos++)
    const results = await Promise.all(ids.map(id =>
      supabase.from('journal_checklist_items')
        .update({ group_id: gid, position: posById.get(id) }).eq('id', id)))
    if (results.some(r => r.error)) { setError(t('checklist.saveError')); return }
    setItems(prev => prev.map(it =>
      selected.has(it.id) ? { ...it, group_id: gid, position: posById.get(it.id) } : it))
    clearSelection()
  }

  const bulkSetMode = async (mode) => {
    const ids = selectedIds()
    if (!ids.length) return
    const { error } = await supabase.from('journal_checklist_items')
      .update({ mode }).in('id', ids)
    if (error) { setError(t('checklist.saveError')); return }
    setItems(prev => prev.map(it => selected.has(it.id) ? { ...it, mode } : it))
    clearSelection()
  }

  const bulkDelete = () => confirm({
    message: t('checklist.bulkDeleteConfirm'), danger: true,
    onConfirm: async () => {
      const ids = selectedIds()
      const { error } = await supabase.from('journal_checklist_items').delete().in('id', ids)
      if (error) { setError(t('checklist.saveError')); return }
      setItems(prev => prev.filter(it => !selected.has(it.id)))
      clearSelection()
    },
  })

  // ---- gruppi ------------------------------------------------------------
  const addGroup = async () => {
    const clean = newGroup.trim()
    if (!clean) return
    const { data, error } = await supabase.from('journal_checklist_groups').insert({
      checklist_id: list.id, title: clean, position: groups.length,
    }).select('*').single()
    if (error) { setError(t('checklist.saveError')); return }
    setGroups(prev => [...prev, data])
    setNewGroup('')
  }
  const renameGroup = (g) => setRenameForm({ id: g.id, title: g.title })
  const saveRename = async () => {
    const clean = (renameForm.title || '').trim()
    if (!clean) return
    const { error } = await supabase.from('journal_checklist_groups').update({ title: clean }).eq('id', renameForm.id)
    if (error) { setError(t('checklist.saveError')); return }
    setGroups(prev => prev.map(x => x.id === renameForm.id ? { ...x, title: clean } : x))
    setRenameForm(null)
  }
  const removeGroup = (g) => confirm({
    message: t('checklist.deleteGroupConfirm'), danger: true,
    onConfirm: async () => {
      const { error } = await supabase.from('journal_checklist_groups').delete().eq('id', g.id)
      if (error) { setError(t('checklist.saveError')); return }
      load()  // gli item del gruppo diventano sciolti (group_id -> null via ON DELETE SET NULL)
    },
  })

  // ---- posizione sciolti (per-checklist) ---------------------------------
  const setLoosePos = async (pos) => {
    setList(prev => ({ ...prev, loose_position: pos }))
    await supabase.from('journal_checklists').update({ loose_position: pos }).eq('id', list.id)
  }

  // ---- ordinamento per-sezione -------------------------------------------
  // Applica una modalità a un sottoinsieme di item. 'custom' = per position;
  // 'alpha' = per label; 'insert' = per created_at (fallback su position).
  const sortItems = (arr, mode) => {
    const copy = [...arr]
    if (mode === 'alpha') {
      copy.sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }))
    } else if (mode === 'insert') {
      copy.sort((a, b) => {
        const ta = a.created_at || '', tb = b.created_at || ''
        if (ta !== tb) return ta < tb ? -1 : 1
        return (a.position ?? 0) - (b.position ?? 0)
      })
    } else {
      copy.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    }
    return copy
  }

  // Quando si passa VERSO custom, congela l'ordine visibile scrivendo le position,
  // così il drag riparte da dove si vedeva e non "salta".
  const persistOrderAsCustom = async (subset) => {
    const results = await Promise.all(subset.map((it, i) =>
      supabase.from('journal_checklist_items').update({ position: i }).eq('id', it.id)))
    if (results.some(r => r.error)) { setError(t('checklist.saveError')); return }
    setItems(prev => {
      const posById = new Map(subset.map((it, i) => [it.id, i]))
      return prev.map(it => posById.has(it.id) ? { ...it, position: posById.get(it.id) } : it)
    })
  }

  const setGroupSortMode = async (group, mode) => {
    if (mode === 'custom') {
      const visible = sortItems(items.filter(it => it.group_id === group.id), group.sort_mode || 'custom')
      await persistOrderAsCustom(visible)
    }
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, sort_mode: mode } : g))
    const { error } = await supabase.from('journal_checklist_groups').update({ sort_mode: mode }).eq('id', group.id)
    if (error) setError(t('checklist.saveError'))
  }

  const setLooseSortMode = async (mode) => {
    if (mode === 'custom') {
      const visible = sortItems(items.filter(it => it.group_id === null), list.loose_sort_mode || 'custom')
      await persistOrderAsCustom(visible)
    }
    setList(prev => ({ ...prev, loose_sort_mode: mode }))
    const { error } = await supabase.from('journal_checklists').update({ loose_sort_mode: mode }).eq('id', list.id)
    if (error) setError(t('checklist.saveError'))
  }

  // ---- meta checklist ----------------------------------------------------
  const openMeta = () => {
    setMetaForm({
      title: list.title || '', description: list.description || '',
      tags: (list.tags || []).join(', '), visibility: list.visibility || 'private',
    })
    setShowMeta(true)
  }
  const saveMeta = async () => {
    if (!metaForm.title.trim()) return
    const { error } = await supabase.from('journal_checklists').update({
      title: metaForm.title.trim(),
      description: metaForm.description.trim() || null,
      tags: parseTags(metaForm.tags),
      visibility: metaForm.visibility,
    }).eq('id', list.id)
    if (error) { setError(t('checklist.saveError')); return }
    setShowMeta(false); load()
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (notAllowed) return (
    <div className="obt-page">
      <div className="obt-panel obt-empty">
        <div className="obt-empty-icon"><i className="ti ti-checklist" /></div>
        <h3>{t('checklist.notFound')}</h3>
        <button className="obt-btn obt-btn--primary" onClick={() => navigate('/journal')}>&larr; {t('checklist.back')}</button>
      </div>
    </div>
  )

  const loosePos = list.loose_position || 'top'

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate(`/journal/checklist/${checklistId}`)}>
              <i className="ti ti-check" /> {t('checklist.toReading')}
            </button>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openMeta}>
              <i className="ti ti-settings" /> {t('common.edit')}
            </button>
          </div>
          <div className="obt-hero-title">
            <h1>{list.title}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">{t('checklist.editorTitle')}</p>
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('checklist.itemCount')}</span> {items.length}
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}

        <div className="obt-editor-cols">
          {/* ---- SINISTRA: inserimento + voci ---- */}
          <div className="obt-editor-main">
            <div className="obt-panel">
              <div className="obt-quickrow">
                <div className="obt-quickrow-mode">
                  <button type="button" onClick={() => setQuickMode('single')} title={t('checklist.modeSingle')} className={quickMode === 'single' ? 'is-active' : ''}>●</button>
                  <button type="button" onClick={() => setQuickMode('pair')} title={t('checklist.modePair')} className={quickMode === 'pair' ? 'is-active' : ''}>♀♂</button>
                </div>
                <select className="obt-input obt-quickrow-group" value={targetGroup} onChange={e => setTargetGroup(e.target.value)}>
                  <option value="">{t('checklist.noGroupSection')}</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <input ref={inputRef} className="obt-input" value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraft() } }}
                  placeholder={t('checklist.quickAddPlaceholder')} autoFocus
                  style={{ flex: 1 }} />
                <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={addDraft} disabled={!draft.trim()}>
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="obt-panel obt-empty">
                <p>{t('checklist.emptyEditor')}</p>
              </div>
            ) : (
              <>
                {(list.loose_position || 'top') === 'top' && (
                  <ItemGroup t={t} title={t('checklist.noGroupSection')}
                    groupItems={sortItems(items.filter(it => it.group_id === null), list.loose_sort_mode || 'custom')}
                    sortMode={list.loose_sort_mode || 'custom'} onSortMode={setLooseSortMode}
                    onReorder={reorderItemsInGroup} onEdit={setItemForm} onDelete={removeItem}
                    selected={selected} onToggleSelect={toggleSelect} />
                )}
                {groups.map(g => (
                  <ItemGroup key={g.id} t={t} title={g.title}
                    groupItems={sortItems(items.filter(it => it.group_id === g.id), g.sort_mode || 'custom')}
                    sortMode={g.sort_mode || 'custom'} onSortMode={(m) => setGroupSortMode(g, m)}
                    onReorder={reorderItemsInGroup} onEdit={setItemForm} onDelete={removeItem}
                    selected={selected} onToggleSelect={toggleSelect} />
                ))}
                {(list.loose_position || 'top') === 'bottom' && (
                  <ItemGroup t={t} title={t('checklist.noGroupSection')}
                    groupItems={sortItems(items.filter(it => it.group_id === null), list.loose_sort_mode || 'custom')}
                    sortMode={list.loose_sort_mode || 'custom'} onSortMode={setLooseSortMode}
                    onReorder={reorderItemsInGroup} onEdit={setItemForm} onDelete={removeItem}
                    selected={selected} onToggleSelect={toggleSelect} />
                )}
              </>
            )}
          </div>

          {/* ---- DESTRA: gerarchia gruppi ---- */}
          <div className="obt-editor-side">
            <div className="obt-panel">
              <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>{t('checklist.groupsHierarchy')}</h3>

              {/* toggle posizione sciolti */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>{t('checklist.loosePos')}</div>
                <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <button type="button" onClick={() => setLoosePos('top')} style={segStyle(loosePos === 'top')}>{t('checklist.loosePosTop')}</button>
                  <button type="button" onClick={() => setLoosePos('bottom')} style={segStyle(loosePos === 'bottom')}>{t('checklist.loosePosBottom')}</button>
                </div>
              </div>

              {/* elenco gruppi trascinabili */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {groups.map(g => {
                  const count = items.filter(it => it.group_id === g.id).length
                  return (
                    <div key={g.id} {...groupDrag.dragProps(g)}
                      style={{ ...groupDrag.dragProps(g).style, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--line)' }}>
                      <i className="ti ti-grip-vertical" style={{ color: 'var(--ink-soft)', fontSize: 14 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{g.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{count}</span>
                      <button className="obt-icon-btn" title={t('common.edit')} onClick={() => renameGroup(g)}><i className="ti ti-pencil" /></button>
                      <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={() => removeGroup(g)}><i className="ti ti-trash" /></button>
                    </div>
                  )
                })}
              </div>

              {/* aggiungi gruppo */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <input className="obt-input" value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGroup() } }}
                  placeholder={t('checklist.groupTitlePlaceholder')} style={{ flex: 1 }} />
                <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={addGroup} disabled={!newGroup.trim()}>
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- MODAL voce esistente ---- */}
      <Modal open={!!itemForm} onClose={() => setItemForm(null)} title={t('checklist.editItem')} size="md">
        {itemForm && (
          <>
            <div className="obt-field">
              <label>{t('checklist.itemLabel')} *</label>
              <input className="obt-input" value={itemForm.label} onChange={e => setItemForm({ ...itemForm, label: e.target.value })} />
            </div>
            <div className="obt-field">
              <label>{t('checklist.itemMode')}</label>
              <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <button type="button" onClick={() => setItemForm({ ...itemForm, mode: 'single' })} style={segStyle(itemForm.mode === 'single')}>{t('checklist.modeSingle')}</button>
                <button type="button" onClick={() => setItemForm({ ...itemForm, mode: 'pair' })} style={segStyle(itemForm.mode === 'pair')}>{t('checklist.modePair')}</button>
              </div>
            </div>
            <div className="obt-field">
              <label>{t('checklist.itemGroup')}</label>
              <select className="obt-input" value={itemForm.group_id || ''} onChange={e => setItemForm({ ...itemForm, group_id: e.target.value })}>
                <option value="">{t('checklist.noGroupSection')}</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <div className="obt-field">
              <label>{t('checklist.itemNotes')} <span className="obt-optional">{t('common.optional')}</span></label>
              <input className="obt-input" value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} placeholder={t('checklist.itemNotesPlaceholder')} />
            </div>
            <div className="obt-actions">
              <button className="obt-btn obt-btn--primary" onClick={saveItem} disabled={!itemForm.label.trim()}>{t('common.saveChanges')}</button>
              <button className="obt-btn obt-btn--ghost" onClick={() => setItemForm(null)}>{t('common.cancel')}</button>
            </div>
          </>
        )}
      </Modal>

      {/* ---- MODAL meta ---- */}
      <Modal open={showMeta} onClose={() => setShowMeta(false)} title={t('checklist.editTitle')} size="md">
        <div className="obt-field">
          <label>{t('checklist.name')} *</label>
          <input className="obt-input" value={metaForm.title} onChange={e => setMetaForm({ ...metaForm, title: e.target.value })} />
        </div>
        <div className="obt-field">
          <label>{t('checklist.description')} <span className="obt-optional">{t('common.optional')}</span></label>
          <textarea className="obt-textarea" rows={3} value={metaForm.description} onChange={e => setMetaForm({ ...metaForm, description: e.target.value })} />
        </div>
        <div className="obt-field">
          <label>{t('journal.tags')} <span className="obt-optional">{t('common.optional')}</span></label>
          <input className="obt-input" value={metaForm.tags} onChange={e => setMetaForm({ ...metaForm, tags: e.target.value })} placeholder={t('journal.tagsPlaceholder')} />
        </div>
        <div className="obt-field">
          <label>{t('visibility.label')}</label>
          <VisibilityToggle value={metaForm.visibility} onChange={v => setMetaForm({ ...metaForm, visibility: v })} variant="full" shareUrl={shareUrl} />
        </div>
        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={saveMeta} disabled={!metaForm.title.trim()}>{t('common.saveChanges')}</button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowMeta(false)}>{t('common.cancel')}</button>
        </div>
      </Modal>

      {/* ---- MODAL rinomina gruppo ---- */}
      <Modal open={!!renameForm} onClose={() => setRenameForm(null)} title={t('checklist.editGroup')} size="sm">
        {renameForm && (
          <>
            <div className="obt-field">
              <label>{t('checklist.groupTitle')} *</label>
              <input className="obt-input" value={renameForm.title} autoFocus
                onChange={e => setRenameForm({ ...renameForm, title: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && renameForm.title.trim()) saveRename() }} />
            </div>
            <div className="obt-actions">
              <button className="obt-btn obt-btn--primary" onClick={saveRename} disabled={!renameForm.title.trim()}>{t('common.saveChanges')}</button>
              <button className="obt-btn obt-btn--ghost" onClick={() => setRenameForm(null)}>{t('common.cancel')}</button>
            </div>
          </>
        )}
      </Modal>

      {selected.size > 0 && (
        <div className="obt-bulkbar">
          <span className="obt-bulkbar-count">
            <strong>{selected.size}</strong> {t('checklist.selectedCount')}
          </span>
          <div className="obt-bulkbar-sep" />
          <select className="obt-input obt-input--sm" value=""
            onChange={e => { bulkMove(e.target.value); e.target.value = '' }}>
            <option value="" disabled>{t('checklist.bulkMoveTo')}</option>
            <option value="">{t('checklist.noGroupSection')}</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => bulkSetMode('single')}>
            {t('checklist.bulkSetSingle')}
          </button>
          <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => bulkSetMode('pair')}>
            {t('checklist.bulkSetPair')}
          </button>
          <button className="obt-btn obt-btn--danger obt-btn--sm" onClick={bulkDelete}>
            <i className="ti ti-trash" /> {t('checklist.bulkDelete')}
          </button>
          <button className="obt-icon-btn" title={t('checklist.bulkClear')} onClick={clearSelection}>
            <i className="ti ti-x" />
          </button>
        </div>
      )}
      {dialog}
    </>
  )
}

const segStyle = (active) => ({
  padding: '6px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
  cursor: 'pointer', border: 'none',
  background: active ? 'var(--primary)' : 'var(--card)',
  color: active ? '#fff' : 'var(--ink-soft)',
})

// Sezione voci di un singolo gruppo (o degli sciolti), con drag&drop interno.
// Ogni ItemGroup monta la propria useDragOrder sul proprio sottoinsieme, così
// il riordino resta confinato al gruppo e le position scritte sono coerenti.
function ItemGroup({ t, title, groupItems, onReorder, onEdit, onDelete, selected, onToggleSelect, sortMode = 'custom', onSortMode }) {
  const isCustom = sortMode === 'custom'
  const drag = useDragOrder({ items: groupItems, table: 'journal_checklist_items', onReorder, enabled: isCustom })
  if (groupItems.length === 0) return null
  return (
    <div className="obt-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--ink-soft)', flex: 1, minWidth: 0 }}>
          {title} <span style={{ fontWeight: 600 }}>· {groupItems.length}</span>
        </div>
        {onSortMode && (
          <div className="obt-sortseg">
            <button type="button" onClick={() => onSortMode('custom')} className={isCustom ? 'is-active' : ''} title={t('checklist.sortCustom')}>
              <i className="ti ti-arrows-sort" />
            </button>
            <button type="button" onClick={() => onSortMode('alpha')} className={sortMode === 'alpha' ? 'is-active' : ''} title={t('checklist.sortAlpha')}>
              <i className="ti ti-sort-a-z" />
            </button>
            <button type="button" onClick={() => onSortMode('insert')} className={sortMode === 'insert' ? 'is-active' : ''} title={t('checklist.sortInsert')}>
              <i className="ti ti-clock" />
            </button>
          </div>
        )}
      </div>
      {groupItems.map(it => {
        const isSel = selected?.has(it.id)
        const dp = drag.dragProps(it)
        return (
        <div key={it.id}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--line)',
            background: isSel ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : undefined }}>
          <label style={{ display: 'flex', alignItems: 'center', padding: '2px 4px', flexShrink: 0, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!isSel} draggable={false}
              onChange={() => onToggleSelect?.(it.id)}
              style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 16, height: 16 }} />
          </label>
          {/* Solo da qui in poi la riga è trascinabile: il grip e il contenuto. */}
          <div {...dp}
            style={{ ...dp.style, display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {isCustom && <i className="ti ti-grip-vertical" style={{ color: 'var(--ink-soft)', fontSize: 14, flexShrink: 0 }} />}
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', minWidth: 26 }}>
              {it.mode === 'pair' ? '♀♂' : '●'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</span>
              {it.notes && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{it.notes}</div>}
            </div>
          </div>
          <button className="obt-icon-btn" title={t('common.edit')}
            onClick={() => onEdit({ id: it.id, group_id: it.group_id || '', label: it.label, mode: it.mode, notes: it.notes || '' })}>
            <i className="ti ti-pencil" />
          </button>
          <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={() => onDelete(it.id)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      )})}
    </div>
  )
}
