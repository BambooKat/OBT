// src/pages/ChecklistPage.jsx
// Vista in sola LETTURA di una checklist: lista pulita, spuntabile.
// Si USA qui (segni cosa hai, vedi il progresso). La costruzione (gruppi/voci)
// sta nell'editor a due colonne su /journal/checklist/:id/edit.
// Viste anon/non-owner: spunte disabilitate, nessun controllo di modifica.

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { useConfirm } from './ConfirmDialog'

const itemDone = (it) =>
  it.mode === 'pair' ? (it.have_m && it.have_f) : it.have_single

export default function ChecklistPage() {
  const { t, formatDate } = useT()
  const { checklistId } = useParams()
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()

  const [list, setList] = useState(null)
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const patchItem = async (item, patch) => {
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, ...patch } : it))
    const { error } = await supabase
      .from('journal_checklist_items').update(patch).eq('id', item.id)
    if (error) { setError(t('checklist.saveError')); load() }
  }
  const toggleSingle = (it) => patchItem(it, { have_single: !it.have_single })
  const toggleF = (it) => patchItem(it, { have_f: !it.have_f })
  const toggleM = (it) => patchItem(it, { have_m: !it.have_m })

  const removeList = () => confirm({
    message: t('checklist.deleteConfirm'), danger: true,
    onConfirm: async () => {
      const { error } = await supabase.from('journal_checklists').delete().eq('id', list.id)
      if (error) { setError(t('checklist.saveError')); return }
      navigate('/journal')
    },
  })

  const StateBox = ({ checked, label, onClick }) => (
    <button type="button" onClick={onClick || undefined} disabled={!onClick} title={label}
      style={{
        width: 38, height: 38, borderRadius: 8, fontSize: 15, fontWeight: 800,
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
      </div>
    )
  }

  const GroupBlock = ({ g }) => {
    const gs = groupStats(g.id)
    const gi = items.filter(it => it.group_id === g.id)
    if (gi.length === 0) return null
    return (
      <div className="obt-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{g.title}</h3>
          <span style={{ fontSize: 12, fontWeight: 700, color: gs.complete ? 'var(--primary)' : 'var(--ink-soft)' }}>
            {gs.done}/{gs.total}{gs.complete && <> · <i className="ti ti-circle-check" /></>}
          </span>
        </div>
        {gi.map(it => <ItemRow key={it.id} it={it} />)}
      </div>
    )
  }

  const LooseBlock = () => {
    const loose = items.filter(it => it.group_id === null)
    if (loose.length === 0) return null
    return (
      <div className="obt-panel">
        {groups.length > 0 && (
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{t('checklist.noGroupSection')}</h3>
        )}
        {loose.map(it => <ItemRow key={it.id} it={it} />)}
      </div>
    )
  }

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

  const loosePos = list.loose_position || 'top'

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/journal')}>&larr; {t('checklist.back')}</button>
            {isOwner && (
              <>
                <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate(`/journal/checklist/${checklistId}/edit`)}>
                  <i className="ti ti-pencil" /> {t('checklist.toEditing')}
                </button>
                <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={removeList}>
                  <i className="ti ti-trash" /> {t('common.delete')}
                </button>
              </>
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

        {items.length === 0 ? (
          <div className="obt-panel obt-empty">
            <div className="obt-empty-icon"><i className="ti ti-list-check" /></div>
            <h3>{t('checklist.itemsEmpty')}</h3>
            {isOwner && (
              <button className="obt-btn obt-btn--primary" onClick={() => navigate(`/journal/checklist/${checklistId}/edit`)}>
                {t('checklist.toEditing')}
              </button>
            )}
          </div>
        ) : (
          <>
            {loosePos === 'top' && (
              <div className="obt-checklist-grid"><LooseBlock /></div>
            )}
            <div className="obt-checklist-grid">
              {groups.map(g => <GroupBlock key={g.id} g={g} />)}
            </div>
            {loosePos === 'bottom' && (
              <div className="obt-checklist-grid"><LooseBlock /></div>
            )}
          </>
        )}
      </div>

      {dialog}
    </>
  )
}
