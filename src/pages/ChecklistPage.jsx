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

  // Gruppi aperti/chiusi (accordion): stato per-checklist, persistito in localStorage.
  // Chiave: id gruppo -> bool. Assente/false = chiuso.
  const [openGroups, setOpenGroups] = useState({})

  useEffect(() => { load() }, [checklistId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`obt-checklist-open-${checklistId}`)
      setOpenGroups(raw ? JSON.parse(raw) : {})
    } catch { setOpenGroups({}) }
  }, [checklistId])

  const persistOpenGroups = (next) => {
    setOpenGroups(next)
    try { localStorage.setItem(`obt-checklist-open-${checklistId}`, JSON.stringify(next)) } catch {}
  }
  const toggleGroup = (groupId) => {
    persistOpenGroups({ ...openGroups, [groupId]: !openGroups[groupId] })
  }
  const expandAll = () => {
    const next = { __loose__: true }
    groups.forEach(g => { next[g.id] = true })
    persistOpenGroups(next)
  }
  const collapseAll = () => persistOpenGroups({})

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

  // Stesso ordinamento per-sezione dell'editor (custom/alpha/insert).
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

  const StateBox = ({ checked, label, onClick, done }) => (
    <button type="button" onClick={onClick || undefined} disabled={!onClick} title={label}
      style={{
        width: 30, height: 30, borderRadius: 8, fontSize: 13, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit',
        border: '1px solid ' + (checked ? (done ? 'var(--good-text)' : 'var(--primary)') : 'var(--line)'),
        background: checked ? (done ? 'var(--good-text)' : 'var(--primary)') : 'var(--card)',
        color: checked ? '#fff' : 'var(--ink-soft)', transition: 'all .12s',
      }}>
      {checked ? <i className="ti ti-check" /> : label}
    </button>
  )

  const ItemRow = ({ it }) => {
    const done = itemDone(it)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
        borderBottom: '0.5px solid var(--line)',
        background: done ? 'var(--good-bg)' : 'transparent',
        borderRadius: done ? 6 : 0,
        transition: 'background .15s',
      }}>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {it.mode === 'single' ? (
            <StateBox checked={it.have_single} label={t('checklist.haveShort')} onClick={isOwner ? () => toggleSingle(it) : null} done={done} />
          ) : (
            <>
              <StateBox checked={it.have_f} label="♀" onClick={isOwner ? () => toggleF(it) : null} done={done} />
              <StateBox checked={it.have_m} label="♂" onClick={isOwner ? () => toggleM(it) : null} done={done} />
            </>
          )}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: done ? 'var(--good-text)' : 'var(--ink)' }}>
          {it.label}
        </span>
      </div>
    )
  }

  const GroupBand = ({ children, className, onClick }) => (
    onClick ? (
      <button type="button" className={`obt-group-band obt-group-band--toggle ${className}`} onClick={onClick}>
        {children}
      </button>
    ) : (
      <div className={`obt-group-band ${className}`}>{children}</div>
    )
  )

  const GroupBlock = ({ g, bandIndex }) => {
    const gs = groupStats(g.id)
    const gi = sortItems(items.filter(it => it.group_id === g.id), g.sort_mode || 'custom')
    if (gi.length === 0) return null
    const isOpen = !!openGroups[g.id]
    return (
      <div className="obt-panel obt-group-panel">
        <GroupBand className={`obt-group-band--v${bandIndex % 4}`} onClick={() => toggleGroup(g.id)}>
          <i className={`ti ti-chevron-right obt-group-chevron${isOpen ? ' is-open' : ''}`} />
          <h3 style={{ margin: 0, fontSize: 16 }}>{g.title}</h3>
          <span className="obt-group-band-count">
            {gs.done}/{gs.total}{gs.complete && <> · <i className="ti ti-circle-check" /></>}
          </span>
        </GroupBand>
        {isOpen && gi.map(it => <ItemRow key={it.id} it={it} />)}
      </div>
    )
  }

  const LooseBlock = () => {
    const loose = sortItems(items.filter(it => it.group_id === null), list.loose_sort_mode || 'custom')
    if (loose.length === 0) return null
    const hasBand = groups.length > 0
    const isOpen = hasBand ? !!openGroups['__loose__'] : true
    return (
      <div className="obt-panel obt-group-panel">
        {hasBand && (
          <GroupBand className="obt-group-band--loose" onClick={() => toggleGroup('__loose__')}>
            <i className={`ti ti-chevron-right obt-group-chevron${isOpen ? ' is-open' : ''}`} />
            <h3 style={{ margin: 0, fontSize: 16 }}>{t('checklist.noGroupSection')}</h3>
            <span className="obt-group-band-count">
              {loose.filter(itemDone).length}/{loose.length}
            </span>
          </GroupBand>
        )}
        {isOpen && loose.map(it => <ItemRow key={it.id} it={it} />)}
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
            {list.description && (
              <p className="obt-hero-desc" style={{ marginTop: 4 }}>{list.description}</p>
            )}
            {(list.tags || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 'auto', paddingTop: 16 }}>
                {list.tags.map(tag => (
                  <span key={tag} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('checklist.progress')}</span>
              <span>{stats.done}/{stats.total}{stats.complete && <> <i className="ti ti-circle-check" style={{ color: 'var(--primary)' }} /></>}</span>
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('checklist.date')}</span>
              <span>{formatDate(list.created_at)}</span>
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('checklist.status')}</span>
              <span>
                {list.visibility === 'private'
                  ? <><i className="ti ti-lock" /> {t('visibility.private')}</>
                  : <><i className="ti ti-link" /> {t('visibility.unlisted')}</>}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}

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
            <div className="obt-checklist-toolbar">
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={expandAll}>
                <i className="ti ti-chevrons-down" /> {t('checklist.expandAll')}
              </button>
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={collapseAll}>
                <i className="ti ti-chevrons-up" /> {t('checklist.collapseAll')}
              </button>
            </div>
            {loosePos === 'top' && (
              <div className="obt-checklist-grid"><LooseBlock /></div>
            )}
            <div className="obt-checklist-grid">
              {groups.map((g, i) => <GroupBlock key={g.id} g={g} bandIndex={i} />)}
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
