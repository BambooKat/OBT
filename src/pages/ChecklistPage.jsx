// src/pages/ChecklistPage.jsx
// Dettaglio + editor di una checklist. Item sciolti (group_id null) e item in
// gruppi convivono. L'inserimento è INLINE: una riga "aggiungi voce" in fondo a
// ogni gruppo e alla zona sciolti — scrivi, premi Invio, si aggiunge e l'input
// resta pronto per la prossima. La modalità (singolo/coppia) è persistente:
// l'ultima scelta vale per le voci successive.
//
// Modalità item: single -> una spunta; pair -> ♀/♂, completo con entrambe.
// Completamento client-side. Scrittura immediata (ogni Invio salva).
// Visibilità Privato/Linkabile. Viste read-only (anon/non-owner) nascondono i controlli.

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'
import VisibilityToggle from './VisibilityToggle'

const itemDone = (it) =>
  it.mode === 'pair' ? (it.have_m && it.have_f) : it.have_single

const parseTags = (raw) =>
  (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default function ChecklistPage() {
  const { t, formatDate } = useT()
  const { checklistId } = useParams()
  const navigate = useNavigate()

  const [list, setList] = useState(null)
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // modalità persistente per l'aggiunta rapida (ultima scelta)
  const [quickMode, setQuickMode] = useState('single')

  // editor checklist (titolo/descrizione/tag/visibilità)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', tags: '', visibility: 'private' })

  // editor item esistente (dettaglio: note, gruppo, modalità)
  const [showItem, setShowItem] = useState(false)
  const [itemForm, setItemForm] = useState(null)

  // editor gruppo
  const [showGroup, setShowGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ id: null, title: '' })

  const shareUrl = `${window.location.origin}/journal/checklist/${checklistId}`

  useEffect(() => { load() }, [checklistId])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cl } = await supabase
      .from('journal_checklists').select('*').eq('id', checklistId).maybeSingle()
    if (!cl) { setList(null); setLoading(false); return }

    const owner = !!(user && cl.owner_id === user.id)
    const [{ data: grs }, { data: its }] = await Promise.all([
      supabase.from('journal_checklist_groups').select('*')
        .eq('checklist_id', checklistId).order('position', { ascending: true }),
      supabase.from('journal_checklist_items').select('*')
        .eq('checklist_id', checklistId).order('position', { ascending: true }),
    ])
    setList(cl); setGroups(grs || []); setItems(its || []); setIsOwner(owner)
    setLoading(false)
  }

  // ---- progresso ---------------------------------------------------------
  const stats = useMemo(() => {
    const total = items.length
    const done = items.filter(itemDone).length
    return { total, done, complete: total > 0 && done === total }
  }, [items])

  const groupStats = (groupId) => {
    const gi = items.filter(it => it.group_id === groupId)
    const done = gi.filter(itemDone).length
    return { total: gi.length, done, complete: gi.length > 0 && done === gi.length }
  }

  // ---- toggle stato (solo owner, immediato) ------------------------------
  const patchItem = async (item, patch) => {
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, ...patch } : it))
    const { error } = await supabase
      .from('journal_checklist_items').update(patch).eq('id', item.id)
    if (error) { setError(t('checklist.saveError')); load() }
  }
  const toggleSingle = (item) => patchItem(item, { have_single: !item.have_single })
  const toggleF = (item) => patchItem(item, { have_f: !item.have_f })
  const toggleM = (item) => patchItem(item, { have_m: !item.have_m })

  // ---- aggiunta rapida inline (Invio) ------------------------------------
  // Scrittura immediata: inserisce e ricarica solo gli item, mantiene il focus.
  const quickAdd = async (label, groupId) => {
    const clean = label.trim()
    if (!clean) return
    const { data, error } = await supabase.from('journal_checklist_items').insert({
      checklist_id: list.id,
      group_id: groupId,
      label: clean,
      mode: quickMode,
      position: items.length,
    }).select('*').single()
    if (error) { setError(t('checklist.saveError')); return }
    setItems(prev => [...prev, data]) // append senza reload completo
  }

  // ---- editor item esistente (dettaglio) ---------------------------------
  const openEditItem = (it) => {
    setItemForm({ id: it.id, group_id: it.group_id, label: it.label, mode: it.mode, notes: it.notes || '' })
    setShowItem(true)
  }
  const saveItem = async () => {
    if (!itemForm.label.trim()) return
    const payload = {
      group_id: itemForm.group_id,
      label: itemForm.label.trim(),
      mode: itemForm.mode,
      notes: itemForm.notes.trim() || null,
    }
    const { error } = await supabase.from('journal_checklist_items').update(payload).eq('id', itemForm.id)
    if (error) { setError(t('checklist.saveError')); return }
    setShowItem(false); load()
  }
  const removeItem = async (id) => {
    if (!window.confirm(t('checklist.deleteItemConfirm'))) return
    const { error } = await supabase.from('journal_checklist_items').delete().eq('id', id)
    if (error) { setError(t('checklist.saveError')); return }
    setItems(prev => prev.filter(it => it.id !== id))
  }

  // ---- gruppi ------------------------------------------------------------
  const openNewGroup = () => { setGroupForm({ id: null, title: '' }); setShowGroup(true) }
  const openEditGroup = (g) => { setGroupForm({ id: g.id, title: g.title }); setShowGroup(true) }
  const saveGroup = async () => {
    if (!groupForm.title.trim()) return
    const { error } = groupForm.id
      ? await supabase.from('journal_checklist_groups')
          .update({ title: groupForm.title.trim() }).eq('id', groupForm.id)
      : await supabase.from('journal_checklist_groups').insert({
          checklist_id: list.id, title: groupForm.title.trim(), position: groups.length,
        })
    if (error) { setError(t('checklist.saveError')); return }
    setShowGroup(false); load()
  }
  const removeGroup = async (id) => {
    if (!window.confirm(t('checklist.deleteGroupConfirm'))) return
    const { error } = await supabase.from('journal_checklist_groups').delete().eq('id', id)
    if (error) { setError(t('checklist.saveError')); return }
    load()
  }

  // ---- editor checklist --------------------------------------------------
  const openEdit = () => {
    setEditForm({
      title: list.title || '',
      description: list.description || '',
      tags: (list.tags || []).join(', '),
      visibility: list.visibility || 'private',
    })
    setShowEdit(true)
  }
  const saveEdit = async () => {
    if (!editForm.title.trim()) return
    const { error } = await supabase.from('journal_checklists').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      tags: parseTags(editForm.tags),
      visibility: editForm.visibility,
    }).eq('id', list.id)
    if (error) { setError(t('checklist.saveError')); return }
    setShowEdit(false); load()
  }
  const removeList = async () => {
    if (!window.confirm(t('checklist.deleteConfirm'))) return
    const { error } = await supabase.from('journal_checklists').delete().eq('id', list.id)
    if (error) { setError(t('checklist.saveError')); return }
    navigate('/journal')
  }

  // ---- componenti UI -----------------------------------------------------
  const StateBox = ({ checked, label, onClick }) => (
    <button type="button" onClick={onClick || undefined} disabled={!onClick} title={label}
      style={{
        width: 30, height: 30, borderRadius: 8, fontSize: 13, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit',
        border: '1px solid ' + (checked ? 'var(--primary)' : 'var(--line)'),
        background: checked ? 'var(--primary)' : 'var(--card)',
        color: checked ? '#fff' : 'var(--ink-soft)', transition: 'all .12s',
      }}>
      {checked ? <i className="ti ti-check" /> : label}
    </button>
  )

  const ItemRow = ({ it }) => {
    const done = itemDone(it)
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 6, paddingTop: 1, flexShrink: 0 }}>
          {it.mode === 'single' ? (
            <StateBox checked={it.have_single} label={t('checklist.haveShort')} onClick={isOwner ? () => toggleSingle(it) : null} />
          ) : (
            <>
              <StateBox checked={it.have_f} label="♀" onClick={isOwner ? () => toggleF(it) : null} />
              <StateBox checked={it.have_m} label="♂" onClick={isOwner ? () => toggleM(it) : null} />
            </>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--ink-soft)' : 'var(--ink)' }}>
            {it.label}
          </span>
          {it.notes && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{it.notes}</div>}
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="obt-icon-btn" title={t('common.edit')} onClick={() => openEditItem(it)}><i className="ti ti-pencil" /></button>
            <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={() => removeItem(it.id)}><i className="ti ti-trash" /></button>
          </div>
        )}
      </div>
    )
  }

  // riga di aggiunta rapida: input controllato localmente, Invio aggiunge
  const QuickAdd = ({ groupId }) => {
    const [val, setVal] = useState('')
    const inputRef = useRef(null)
    const submit = async () => {
      if (!val.trim()) return
      await quickAdd(val, groupId)
      setVal('')
      inputRef.current?.focus()
    }
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10 }}>
        {/* toggle modalità persistente */}
        <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)', flexShrink: 0 }}>
          <button type="button" onClick={() => setQuickMode('single')}
            title={t('checklist.modeSingle')} style={qModeStyle(quickMode === 'single')}>●</button>
          <button type="button" onClick={() => setQuickMode('pair')}
            title={t('checklist.modePair')} style={qModeStyle(quickMode === 'pair')}>♀♂</button>
        </div>
        <input ref={inputRef} className="obt-input" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          placeholder={t('checklist.quickAdd')}
          style={{ flex: 1 }} />
        <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={submit} disabled={!val.trim()}>
          <i className="ti ti-plus" />
        </button>
      </div>
    )
  }

  // ---- loading / not found ----------------------------------------------
  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (!list) return (
    <div className="obt-page">
      <div className="obt-panel obt-empty">
        <div className="obt-empty-icon"><i className="ti ti-checklist" /></div>
        <h3>{t('checklist.notFound')}</h3>
        <button className="obt-btn obt-btn--primary" onClick={() => navigate('/journal')}>&larr; {t('checklist.back')}</button>
      </div>
    </div>
  )

  const loose = items.filter(it => it.group_id === null)

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/journal')}>&larr; {t('checklist.back')}</button>
            {isOwner && (
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openEdit}><i className="ti ti-pencil" /> {t('common.edit')}</button>
            )}
          </div>
          <div className="obt-hero-title">
            <h1>{list.title}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">
              {formatDate(list.created_at)}
              {list.visibility !== 'private' && <> · <i className="ti ti-link" /> {t('visibility.unlisted')}</>}
            </p>
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('checklist.progress')}</span> {stats.done}/{stats.total}
              {stats.complete && <> <i className="ti ti-circle-check" style={{ color: 'var(--primary)' }} /></>}
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}

        {list.description && (
          <div className="obt-panel">
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{list.description}</p>
          </div>
        )}

        {(list.tags || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 4px' }}>
            {list.tags.map(tag => (
              <span key={tag} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>{tag}</span>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="obt-panel" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openNewGroup}>+ {t('checklist.addGroup')}</button>
          </div>
        )}

        {/* zona sciolti: item + riga rapida */}
        <div className="obt-panel">
          {loose.length > 0
            ? loose.map(it => <ItemRow key={it.id} it={it} />)
            : (!isOwner && groups.length === 0 && <p className="obt-text-soft" style={{ fontSize: 13, margin: 0 }}>{t('checklist.itemsEmpty')}</p>)}
          {isOwner && <QuickAdd groupId={null} />}
        </div>

        {/* gruppi */}
        {groups.map(g => {
          const gs = groupStats(g.id)
          const gi = items.filter(it => it.group_id === g.id)
          return (
            <div key={g.id} className="obt-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{g.title}</h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: gs.complete ? 'var(--primary)' : 'var(--ink-soft)' }}>
                  {gs.done}/{gs.total}{gs.complete && <> · <i className="ti ti-circle-check" /></>}
                </span>
                {isOwner && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button className="obt-icon-btn" title={t('common.edit')} onClick={() => openEditGroup(g)}><i className="ti ti-pencil" /></button>
                    <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={() => removeGroup(g.id)}><i className="ti ti-trash" /></button>
                  </span>
                )}
              </div>
              {gi.map(it => <ItemRow key={it.id} it={it} />)}
              {isOwner && <QuickAdd groupId={g.id} />}
            </div>
          )
        })}
      </div>

      {/* ---- MODAL: modifica checklist ---- */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('checklist.editTitle')} size="md">
        <div className="obt-field">
          <label>{t('checklist.name')} *</label>
          <input className="obt-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
        </div>
        <div className="obt-field">
          <label>{t('checklist.description')} <span className="obt-optional">{t('common.optional')}</span></label>
          <textarea className="obt-textarea" rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
        </div>
        <div className="obt-field">
          <label>{t('journal.tags')} <span className="obt-optional">{t('common.optional')}</span></label>
          <input className="obt-input" value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} placeholder={t('journal.tagsPlaceholder')} />
          <div className="obt-hint">{t('journal.tagsHint')}</div>
        </div>
        <div className="obt-field">
          <label>{t('visibility.label')}</label>
          <VisibilityToggle value={editForm.visibility} onChange={v => setEditForm({ ...editForm, visibility: v })} variant="full" shareUrl={shareUrl} />
        </div>
        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={saveEdit} disabled={!editForm.title.trim()}>{t('common.saveChanges')}</button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowEdit(false)}>{t('common.cancel')}</button>
        </div>
        <div style={{ borderTop: '0.5px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
          <button className="obt-btn obt-btn--danger obt-btn--sm" onClick={removeList}><i className="ti ti-trash" /> {t('checklist.deleteList')}</button>
        </div>
      </Modal>

      {/* ---- MODAL: item esistente (dettaglio) ---- */}
      <Modal open={showItem} onClose={() => setShowItem(false)} title={t('checklist.editItem')} size="md">
        {itemForm && (
          <>
            <div className="obt-field">
              <label>{t('checklist.itemLabel')} *</label>
              <input className="obt-input" value={itemForm.label} onChange={e => setItemForm({ ...itemForm, label: e.target.value })} />
            </div>
            <div className="obt-field">
              <label>{t('checklist.itemMode')}</label>
              <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <button type="button" onClick={() => setItemForm({ ...itemForm, mode: 'single' })} style={modeSegStyle(itemForm.mode === 'single')}>{t('checklist.modeSingle')}</button>
                <button type="button" onClick={() => setItemForm({ ...itemForm, mode: 'pair' })} style={modeSegStyle(itemForm.mode === 'pair')}>{t('checklist.modePair')}</button>
              </div>
            </div>
            {groups.length > 0 && (
              <div className="obt-field">
                <label>{t('checklist.itemGroup')}</label>
                <select className="obt-input" value={itemForm.group_id || ''} onChange={e => setItemForm({ ...itemForm, group_id: e.target.value || null })}>
                  <option value="">{t('checklist.noGroup')}</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
            )}
            <div className="obt-field">
              <label>{t('checklist.itemNotes')} <span className="obt-optional">{t('common.optional')}</span></label>
              <input className="obt-input" value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} placeholder={t('checklist.itemNotesPlaceholder')} />
            </div>
            <div className="obt-actions">
              <button className="obt-btn obt-btn--primary" onClick={saveItem} disabled={!itemForm.label.trim()}>{t('common.saveChanges')}</button>
              <button className="obt-btn obt-btn--ghost" onClick={() => setShowItem(false)}>{t('common.cancel')}</button>
            </div>
          </>
        )}
      </Modal>

      {/* ---- MODAL: gruppo ---- */}
      <Modal open={showGroup} onClose={() => setShowGroup(false)} title={groupForm.id ? t('checklist.editGroup') : t('checklist.newGroup')} size="sm">
        <div className="obt-field">
          <label>{t('checklist.groupTitle')} *</label>
          <input className="obt-input" value={groupForm.title} onChange={e => setGroupForm({ ...groupForm, title: e.target.value })} placeholder={t('checklist.groupTitlePlaceholder')} />
        </div>
        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={saveGroup} disabled={!groupForm.title.trim()}>{groupForm.id ? t('common.saveChanges') : t('common.create')}</button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowGroup(false)}>{t('common.cancel')}</button>
        </div>
      </Modal>
    </>
  )
}

const modeSegStyle = (active) => ({
  padding: '6px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  cursor: 'pointer', border: 'none',
  background: active ? 'var(--primary)' : 'transparent',
  color: active ? '#fff' : 'var(--ink-soft)',
})
const qModeStyle = (active) => ({
  padding: '6px 10px', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
  cursor: 'pointer', border: 'none', minWidth: 34,
  background: active ? 'var(--primary)' : 'var(--card)',
  color: active ? '#fff' : 'var(--ink-soft)',
})
