// src/pages/Journal.jsx
// Diario personale: voci datate, testo semplice, taggate.
// Niente commenti, niente like: sono appunti tuoi e basta.
// I tag sono testo libero salvato in un array, così non serve una tabella
// a parte e puoi inventarne di nuovi mentre scrivi.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'
import { Markdown, MarkdownToolbar, stripMarkdown } from './markdown'

// "kuroko, aomine , colori" -> ['kuroko','aomine','colori']
const parseTags = (raw) =>
  (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default function Journal() {
  const { t, formatDate } = useT()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', tags: '', is_public: false })
  const bodyRef = useRef(null)

  const [activeTag, setActiveTag] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('journal')
      .select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    if (error) setError(t('journal.loadError'))
    setEntries(data || [])
    setLoading(false)
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ title: '', body: '', tags: activeTag || '', is_public: false })
    setShowForm(true)
  }

  const openEdit = (e) => {
    setEditingId(e.id)
    setForm({ title: e.title || '', body: e.body || '', tags: (e.tags || []).join(', '), is_public: !!e.is_public })
    setShowForm(true)
  }

  const save = async () => {
    setError('')
    if (!form.body.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: form.title.trim() || null,
      body: form.body.trim(),
      tags: parseTags(form.tags),
      is_public: !!form.is_public,
    }
    const { error } = editingId
      ? await supabase.from('journal').update(payload).eq('id', editingId)
      : await supabase.from('journal').insert({ ...payload, owner_id: user.id })
    if (error) { setError(t('journal.saveError')); return }
    setShowForm(false)
    load()
  }

  const remove = async (id) => {
    if (!window.confirm(t('journal.deleteConfirm'))) return
    const { error } = await supabase.from('journal').delete().eq('id', id)
    if (error) { setError(t('journal.saveError')); return }
    load()
  }

  // tutti i tag usati, ordinati per frequenza
  const allTags = useMemo(() => {
    const count = {}
    entries.forEach(e => (e.tags || []).forEach(tag => { count[tag] = (count[tag] || 0) + 1 }))
    return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (activeTag && !(e.tags || []).includes(activeTag)) return false
      if (!q) return true
      return (e.title || '').toLowerCase().includes(q)
        || (e.body || '').toLowerCase().includes(q)
        || (e.tags || []).some(tag => tag.includes(q))
    })
  }, [entries, activeTag, search])

  const TagChip = ({ tag, count, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: active ? 'var(--primary)' : 'var(--card)',
        color: active ? '#fff' : 'var(--ink-soft)',
        border: '1px solid ' + (active ? 'var(--primary)' : 'var(--line)'),
        borderRadius: 999, padding: '4px 11px', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {tag}{count != null && <span style={{ opacity: 0.65 }}>{count}</span>}
    </button>
  )

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={openNew}>
              + {t('journal.new')}
            </button>
          </div>
          <div className="obt-hero-title">
            <h1>{t('journal.title')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">{t('journal.subtitle')}</p>
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('journal.entries')}</span> {entries.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('journal.tags')}</span> {allTags.length}
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">

        {/* filtri */}
        <div className="obt-panel">
          <input
            className="obt-input"
            placeholder={t('journal.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: allTags.length ? 12 : 0 }}
          />
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
            <h3>{entries.length ? t('journal.noMatch') : t('journal.empty')}</h3>
            {!entries.length && (
              <>
                <p>{t('journal.emptyText')}</p>
                <button className="obt-btn obt-btn--primary" onClick={openNew}>{t('journal.new')}</button>
              </>
            )}
          </div>
        ) : (
          filtered.map(e => (
            <div key={e.id} className="obt-panel">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>
                  <Link to={`/journal/${e.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {e.title || t('journal.untitled')}
                  </Link>
                </h3>
                {e.is_public && <span title={t('journal.public')} style={{ fontSize: 12 }}><i className="ti ti-world" /></span>}
                <span className="obt-text-soft" style={{ fontSize: 12 }}>{formatDate(e.created_at)}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="obt-icon-btn" title={t('common.edit')} onClick={() => openEdit(e)}><i className="ti ti-pencil" /></button>
                  <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={() => remove(e.id)}><i className="ti ti-trash" /></button>
                </span>
              </div>
              <p className="obt-journal-preview" style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--ink-soft)' }}>
                {stripMarkdown(e.body)}
              </p>
              <Link to={`/journal/${e.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                {t('journal.readMore')} →
              </Link>
              {(e.tags || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {e.tags.map(tag => (
                    <TagChip key={tag} tag={tag} active={activeTag === tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editingId ? t('journal.editTitle') : t('journal.newTitle')} size="lg">
        <div className="obt-field">
          <label>{t('journal.entryTitle')} <span className="obt-optional">{t('common.optional')}</span></label>
          <input className="obt-input" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder={t('journal.titlePlaceholder')} />
        </div>
        <div className="obt-field">
          <label>{t('journal.body')} *</label>
          <MarkdownToolbar value={form.body} textareaRef={bodyRef}
            onChange={v => setForm({ ...form, body: v })} />
          <textarea ref={bodyRef} className="obt-textarea" rows={10} value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
            placeholder={t('journal.bodyPlaceholder')} />
          <div className="obt-hint">{t('journal.mdHint')}</div>
        </div>
        <div className="obt-field">
          <label>{t('journal.tags')} <span className="obt-optional">{t('common.optional')}</span></label>
          <input className="obt-input" value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder={t('journal.tagsPlaceholder')} />
          <div className="obt-hint">{t('journal.tagsHint')}</div>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {allTags.slice(0, 12).map(([tag]) => (
                <TagChip key={tag} tag={tag} onClick={() => {
                  const cur = parseTags(form.tags)
                  if (cur.includes(tag)) return
                  setForm({ ...form, tags: [...cur, tag].join(', ') })
                }} />
              ))}
            </div>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
          <input type="checkbox" checked={form.is_public}
            onChange={e => setForm({ ...form, is_public: e.target.checked })}
            style={{ width: 16, height: 16, cursor: 'pointer' }} />
          {t('journal.makePublic')}
        </label>

        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={save} disabled={!form.body.trim()}>
            {t('common.saveChanges')}
          </button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
        </div>
      </Modal>
    </>
  )
}
