// src/pages/ChecklistPage.jsx
// Vista in sola LETTURA di una checklist: lista pulita, spuntabile.
// Componenti di rendering definiti FUORI dal componente principale
// per evitare rimount ad ogni setItems (che causava scroll-to-top).

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { useConfirm } from './ConfirmDialog'

// ---------- helpers puri ----------
const itemDone = (it) =>
  it.mode === 'pair' ? (it.have_m && it.have_f) : it.have_single

const sortItems = (arr, mode) => {
  if (mode === 'alpha') return [...arr].sort((a, b) => (a.label || '').localeCompare(b.label || ''))
  if (mode === 'creation') return [...arr].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  return [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// ---------- componenti stateless (fuori dal componente principale) ----------
function StateBox({ checked, label, onClick, done }) {
  return (
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
}

function ItemRow({ it, isOwner, haveShortLabel, onToggleSingle, onToggleF, onToggleM }) {
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
          <StateBox checked={it.have_single} label={haveShortLabel}
            onClick={isOwner ? () => onToggleSingle(it) : null} done={done} />
        ) : (
          <>
            <StateBox checked={it.have_f} label="♀"
              onClick={isOwner ? () => onToggleF(it) : null} done={done} />
            <StateBox checked={it.have_m} label="♂"
              onClick={isOwner ? () => onToggleM(it) : null} done={done} />
          </>
        )}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: done ? 'var(--good-text)' : 'var(--ink)' }}>
        {it.label}
      </span>
    </div>
  )
}

function GroupBand({ children, className, onClick }) {
  return onClick ? (
    <button type="button" className={`obt-group-band obt-group-band--toggle ${className}`} onClick={onClick}>
      {children}
    </button>
  ) : (
    <div className={`obt-group-band ${className}`}>{children}</div>
  )
}

function GroupBlock({ g, bandIndex, items, isOwner, openGroups, onToggleGroup, haveShortLabel, onToggleSingle, onToggleF, onToggleM }) {
  const gi = sortItems(items.filter(it => it.group_id === g.id), g.sort_mode || 'custom')
  if (gi.length === 0) return null
  const done = gi.filter(itemDone).length
  const isOpen = !!openGroups[g.id]
  return (
    <div className="obt-panel obt-group-panel">
      <GroupBand className={`obt-group-band--v${bandIndex % 4}`} onClick={() => onToggleGroup(g.id)}>
        <i className={`ti ti-chevron-right obt-group-chevron${isOpen ? ' is-open' : ''}`} />
        <h3 style={{ margin: 0, fontSize: 16 }}>{g.title}</h3>
        <span className="obt-group-band-count">
          {done}/{gi.length}{done === gi.length && <> · <i className="ti ti-circle-check" /></>}
        </span>
      </GroupBand>
      {isOpen && gi.map(it => (
        <ItemRow key={it.id} it={it} isOwner={isOwner}
          haveShortLabel={haveShortLabel}
          onToggleSingle={onToggleSingle} onToggleF={onToggleF} onToggleM={onToggleM} />
      ))}
    </div>
  )
}

function LooseBlock({ items, looseSortMode, hasBand, isOwner, openGroups, onToggleGroup, noGroupLabel, haveShortLabel, onToggleSingle, onToggleF, onToggleM }) {
  const loose = sortItems(items.filter(it => it.group_id === null), looseSortMode || 'custom')
  if (loose.length === 0) return null
  const isOpen = hasBand ? !!openGroups['__loose__'] : true
  const done = loose.filter(itemDone).length
  return (
    <div className="obt-panel obt-group-panel">
      {hasBand && (
        <GroupBand className="obt-group-band--loose" onClick={() => onToggleGroup('__loose__')}>
          <i className={`ti ti-chevron-right obt-group-chevron${isOpen ? ' is-open' : ''}`} />
          <h3 style={{ margin: 0, fontSize: 16 }}>{noGroupLabel}</h3>
          <span className="obt-group-band-count">{done}/{loose.length}</span>
        </GroupBand>
      )}
      {isOpen && loose.map(it => (
        <ItemRow key={it.id} it={it} isOwner={isOwner}
          haveShortLabel={haveShortLabel}
          onToggleSingle={onToggleSingle} onToggleF={onToggleF} onToggleM={onToggleM} />
      ))}
    </div>
  )
}

// ---------- componente principale ----------
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
    const { data: cl, error: e1 } = await supabase
      .from('journal_checklists').select('*').eq('id', checklistId).single()
    if (e1 || !cl) { setLoading(false); return }
    if (cl.visibility === 'private' && cl.owner_id !== user?.id) { setLoading(false); return }
    const { data: grs } = await supabase
      .from('journal_checklist_groups').select('*').eq('checklist_id', checklistId).order('sort_order')
    const { data: its } = await supabase
      .from('journal_checklist_items').select('*').eq('checklist_id', checklistId).order('sort_order')
    const owner = cl.owner_id === user?.id
    setList(cl); setGroups(grs || []); setItems(its || []); setIsOwner(owner)
    setLoading(false)
  }

  const stats = useMemo(() => {
    const total = items.length
    const done = items.filter(itemDone).length
    return { total, done, complete: total > 0 && done === total }
  }, [items])

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
      if (error) { setError(t('checklist.deleteError')); return }
      navigate('/journal')
    }
  })

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
  const rowProps = { isOwner, haveShortLabel: t('checklist.haveShort'), onToggleSingle: toggleSingle, onToggleF: toggleF, onToggleM: toggleM }

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
              <div className="obt-checklist-grid">
                <LooseBlock items={items} looseSortMode={list.loose_sort_mode}
                  hasBand={groups.length > 0} openGroups={openGroups}
                  onToggleGroup={toggleGroup} noGroupLabel={t('checklist.noGroupSection')}
                  {...rowProps} />
              </div>
            )}
            <div className="obt-checklist-grid">
              {groups.map((g, i) => (
                <GroupBlock key={g.id} g={g} bandIndex={i} items={items}
                  openGroups={openGroups} onToggleGroup={toggleGroup}
                  {...rowProps} />
              ))}
            </div>
            {loosePos === 'bottom' && (
              <div className="obt-checklist-grid">
                <LooseBlock items={items} looseSortMode={list.loose_sort_mode}
                  hasBand={groups.length > 0} openGroups={openGroups}
                  onToggleGroup={toggleGroup} noGroupLabel={t('checklist.noGroupSection')}
                  {...rowProps} />
              </div>
            )}
          </>
        )}
      </div>

      {dialog}
    </>
  )
}
