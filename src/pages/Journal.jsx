// src/pages/Journal.jsx
// Diario unificato: note (testo) e checklist (collezioni) nella STESSA griglia.
// Sono tutte "note" in senso lato; il tipo (kind) le distingue con una linguetta
// colorata + icona. Ordinamento: pinnate in cima, poi per data (desc).
//
// Filtri: ricerca testuale, chip tag (frequenza), chip tipo Note/Checklist
// (mutuamente esclusivi, toggle: riclick azzera). Il pin opera DENTRO il filtro
// attivo — se filtro "solo note", le checklist pinnate non si vedono.

import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { stripMarkdown } from './markdown'
import { useConfirm } from './ConfirmDialog'

const itemDone = (it) =>
  it.mode === 'pair' ? (it.have_m && it.have_f) : it.have_single

export default function Journal() {
  const { t, formatDate } = useT()
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()

  const [notes, setNotes] = useState([])
  const [checklists, setChecklists] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeTag, setActiveTag] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: nts, error: e1 }, { data: cls, error: e2 }] = await Promise.all([
      supabase.from('journal').select('*').eq('owner_id', user.id),
      supabase.from('journal_checklists').select('*').eq('owner_id', user.id),
    ])
    if (e1 || e2) { setError(t('journal.loadError')); setLoading(false); return }

    const ids = (cls || []).map(c => c.id)
    const prog = {}
    if (ids.length) {
      const { data: items } = await supabase
        .from('journal_checklist_items')
        .select('checklist_id, mode, have_single, have_m, have_f')
        .in('checklist_id', ids)
      ;(items || []).forEach(it => {
        const p = prog[it.checklist_id] || { done: 0, total: 0 }
        p.total += 1
        if (itemDone(it)) p.done += 1
        prog[it.checklist_id] = p
      })
    }

    setNotes(nts || [])
    setChecklists(cls || [])
    setProgress(prog)
    setLoading(false)
  }

  const cards = useMemo(() => {
    const noteCards = notes.map(n => ({
      kind: 'note', id: n.id,
      title: n.title || t('journal.untitled'),
      preview: stripMarkdown(n.body || ''),
      tags: n.tags || [], pinned: !!n.pinned,
      visibility: n.visibility || 'private',
      created_at: n.created_at, to: `/journal/${n.id}`,
    }))
    const clCards = checklists.map(c => {
      const p = progress[c.id] || { done: 0, total: 0 }
      return {
        kind: 'checklist', id: c.id, title: c.title,
        preview: c.description || '',
        tags: c.tags || [], pinned: !!c.pinned,
        visibility: c.visibility || 'private',
        created_at: c.created_at, to: `/journal/checklist/${c.id}`,
        progress: p,
      }
    })
    return [...noteCards, ...clCards]
  }, [notes, checklists, progress, t])

  const allTags = useMemo(() => {
    const count = {}
    cards.forEach(c => (c.tags || []).forEach(tag => { count[tag] = (count[tag] || 0) + 1 }))
    return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [cards])

  const counts = useMemo(() => ({
    note: cards.filter(c => c.kind === 'note').length,
    checklist: cards.filter(c => c.kind === 'checklist').length,
  }), [cards])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out = cards.filter(c => {
      if (activeType && c.kind !== activeType) return false
      if (activeTag && !(c.tags || []).includes(activeTag)) return false
      if (!q) return true
      return c.title.toLowerCase().includes(q)
        || (c.preview || '').toLowerCase().includes(q)
        || (c.tags || []).some(tag => tag.includes(q))
    })
    out.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
    return out
  }, [cards, activeType, activeTag, search])

  // edit: scorciatoia dalla card all'editor a pagina intera (non apre la lettura)
  const goEdit = (e, c) => {
    e.preventDefault(); e.stopPropagation()
    navigate(c.kind === 'note' ? `/journal/${c.id}/edit` : `/journal/checklist/${c.id}`)
  }
  // delete diretto dalla card, con conferma OBT centrata; instrada sulla tabella
  const goDelete = (e, c) => {
    e.preventDefault(); e.stopPropagation()
    confirm({
      message: t('journal.deleteConfirm'), danger: true,
      onConfirm: async () => {
        const table = c.kind === 'note' ? 'journal' : 'journal_checklists'
        const { error } = await supabase.from(table).delete().eq('id', c.id)
        if (error) { setError(t('journal.saveError')); return }
        if (c.kind === 'note') setNotes(prev => prev.filter(n => n.id !== c.id))
        else setChecklists(prev => prev.filter(cl => cl.id !== c.id))
      },
    })
  }

  const TagChip = ({ tag, count, active, onClick }) => (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: active ? 'var(--primary)' : 'var(--card)',
      color: active ? '#fff' : 'var(--ink-soft)',
      border: '1px solid ' + (active ? 'var(--primary)' : 'var(--line)'),
      borderRadius: 999, padding: '4px 11px', fontSize: 12, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {tag}{count != null && <span style={{ opacity: 0.65 }}>{count}</span>}
    </button>
  )

  const TypeChip = ({ type, icon, label, count }) => {
    const active = activeType === type
    return (
      <button
        className={`obt-typechip--${type}${active ? ' is-active' : ''}`}
        onClick={() => setActiveType(active ? null : type)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--card)', color: 'var(--ink-soft)',
          border: '1px solid var(--line)',
          borderRadius: 999, padding: '5px 13px', fontSize: 12.5, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <i className={`ti ti-${icon}`} /> {label} <span style={{ opacity: 0.7 }}>{count}</span>
      </button>
    )
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={() => navigate('/journal/new')}>
              <i className="ti ti-notebook" /> {t('journal.newNote')}
            </button>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/journal/checklist/new')}>
              <i className="ti ti-checklist" /> {t('journal.newChecklist')}
            </button>
          </div>
          <div className="obt-hero-title">
            <h1>{t('journal.title')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">{t('journal.subtitle')}</p>
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('journal.entries')}</span> {cards.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('journal.tags')}</span> {allTags.length}
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        <div className="obt-panel">
          <input
            className="obt-input"
            placeholder={t('journal.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: allTags.length ? 12 : 0, flexWrap: 'wrap' }}>
            <TypeChip type="note" icon="notebook" label={t('journal.typeNotes')} count={counts.note} />
            <TypeChip type="checklist" icon="checklist" label={t('journal.typeChecklists')} count={counts.checklist} />
          </div>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <TagChip tag={t('journal.allTags')} active={!activeTag} onClick={() => setActiveTag(null)} />
              {allTags.map(([tag, count]) => (
                <TagChip key={tag} tag={tag} count={count}
                  active={activeTag === tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)} />
              ))}
            </div>
          )}
        </div>

        {error && <div className="obt-alert obt-alert--error">{error}</div>}

        {filtered.length === 0 ? (
          <div className="obt-panel obt-empty">
            <div className="obt-empty-icon"><i className="ti ti-notebook" /></div>
            <h3>{cards.length ? t('journal.noMatch') : t('journal.empty')}</h3>
            {!cards.length && <p>{t('journal.emptyText')}</p>}
          </div>
        ) : (
          <div className="obt-grid">
            {filtered.map(c => (
              <Link key={`${c.kind}-${c.id}`} to={c.to}
                className={`obt-card obt-card--${c.kind}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <span className="obt-badge">
                  <i className={`ti ti-${c.kind === 'note' ? 'notebook' : 'checklist'}`} />
                </span>
                {c.pinned && (
                  <span className="obt-pin is-pinned" title={t('journal.pinned')}>
                    <i className="ti ti-pin" />
                  </span>
                )}

                {/* scorciatoie owner: edit -> editor pagina intera, delete diretto */}
                <span className="obt-card-actions" onClick={e => e.preventDefault()}>
                  <button className="obt-icon-btn" title={t('common.edit')} onClick={e => goEdit(e, c)}>
                    <i className="ti ti-pencil" />
                  </button>
                  <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={e => goDelete(e, c)}>
                    <i className="ti ti-trash" />
                  </button>
                </span>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{c.title}</h3>
                  {c.visibility !== 'private' && (
                    <i className="ti ti-link" title={t('visibility.unlisted')} style={{ fontSize: 12, color: 'var(--ink-soft)' }} />
                  )}
                </div>
                <div className="obt-meta" style={{ marginTop: 4 }}>{formatDate(c.created_at)}</div>

                {c.kind === 'note' ? (
                  c.preview && <p className="obt-card-preview">{c.preview}</p>
                ) : (
                  <>
                    {c.preview && <p className="obt-card-preview">{c.preview}</p>}
                    <div className="obt-card-progress">
                      <div style={{ width: `${c.progress.total ? Math.round((c.progress.done / c.progress.total) * 100) : 0}%` }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginTop: 6 }}>
                      {c.progress.done}/{c.progress.total}
                      {c.progress.total > 0 && c.progress.done === c.progress.total && <> · <i className="ti ti-circle-check" style={{ color: 'var(--kind-checklist)' }} /></>}
                    </div>
                  </>
                )}

                {(c.tags || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
                    {c.tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{
                        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999,
                        padding: '2px 9px', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      {dialog}
    </>
  )
}
