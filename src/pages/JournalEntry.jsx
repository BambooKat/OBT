// src/pages/JournalEntry.jsx
// Pagina di una singola voce del diario. Ha un URL proprio, così una voce
// resa pubblica si può mandare a qualcuno senza aprire tutto il diario.
// Tutto ciò che si modifica (testo, tag, visibilità, link) sta nel modal
// di modifica: un posto solo, niente controlli sparsi per la pagina.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'
import { Markdown, MarkdownToolbar } from './markdown'

const parseTags = (raw) =>
  (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default function JournalEntry() {
  const { t, formatDate } = useT()
  const { entryId } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', tags: '', is_public: false })
  const bodyRef = useRef(null)

  const shareUrl = `${window.location.origin}/journal/${entryId}`

  useEffect(() => { load() }, [entryId])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('journal').select('*').eq('id', entryId).maybeSingle()
    setEntry(data || null)
    setIsOwner(!!(data && user && data.owner_id === user.id))
    setLoading(false)
  }

  const openEdit = () => {
    setError('')
    setForm({
      title: entry.title || '',
      body: entry.body || '',
      tags: (entry.tags || []).join(', '),
      is_public: !!entry.is_public,
    })
    setShowEdit(true)
  }

  const save = async () => {
    setError('')
    if (!form.body.trim()) return
    const { error } = await supabase.from('journal').update({
      title: form.title.trim() || null,
      body: form.body.trim(),
      tags: parseTags(form.tags),
      is_public: !!form.is_public,
    }).eq('id', entry.id)
    if (error) { setError(t('journal.saveError')); return }
    setShowEdit(false)
    load()
  }

  const remove = async () => {
    if (!window.confirm(t('journal.deleteConfirm'))) return
    const { error } = await supabase.from('journal').delete().eq('id', entry.id)
    if (error) { setError(t('journal.saveError')); return }
    navigate('/journal')
  }

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl) }
    catch { window.prompt(t('journal.copyPrompt'), shareUrl); return }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (!entry) return (
    <div className="obt-page">
      <div className="obt-panel obt-empty">
        <div className="obt-empty-icon"><i className="ti ti-notebook" /></div>
        <h3>{t('journal.notFound')}</h3>
        <button className="obt-btn obt-btn--primary" onClick={() => navigate('/journal')}>&larr; {t('journal.back')}</button>
      </div>
    </div>
  )

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/journal')}>&larr; {t('journal.back')}</button>
            {isOwner && (
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openEdit}><i className="ti ti-pencil" /> {t('common.edit')}</button>
            )}
          </div>
          <div className="obt-hero-title">
            <h1>{entry.title || t('journal.untitled')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">
              {formatDate(entry.created_at)}
              {entry.is_public && <> · <i className="ti ti-world" /> {t('journal.public')}</>}
            </p>
          </div>
          <div className="obt-hero-info">
            {(entry.tags || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                {entry.tags.map(tag => (
                  <span key={tag} style={{
                    background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999,
                    padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)',
                  }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="obt-page">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}
        <div className="obt-panel">
          <Markdown text={entry.body} />
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('journal.editTitle')} size="lg">
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
          <textarea ref={bodyRef} className="obt-textarea" rows={12} value={form.body}
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
        </div>

        {/* visibilità e link di condivisione: qui, non sparsi per la pagina */}
        <div style={{ borderTop: '0.5px solid var(--line)', margin: '14px 0', paddingTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={form.is_public}
              onChange={e => setForm({ ...form, is_public: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            {t('journal.makePublic')}
          </label>
          <p className="obt-hint" style={{ marginTop: 6 }}>
            {form.is_public ? t('journal.shareHint') : t('journal.privateHint')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, opacity: form.is_public ? 1 : 0.45 }}>
            <input className="obt-input" value={shareUrl} readOnly disabled={!form.is_public}
              onFocus={e => { if (form.is_public) e.target.select() }}
              style={{ fontFamily: 'monospace', fontSize: 12 }} />
            <button type="button" className="obt-btn obt-btn--ghost obt-btn--sm" onClick={copyLink}
              disabled={!form.is_public} style={{ whiteSpace: 'nowrap' }}>
              {copied ? t('projectDash.copied') : t('common.copy')}
            </button>
          </div>
        </div>

        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={save} disabled={!form.body.trim()}>
            {t('common.saveChanges')}
          </button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowEdit(false)}>{t('common.cancel')}</button>
        </div>

        <div style={{ borderTop: '0.5px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
          <button type="button" className="obt-btn obt-btn--danger obt-btn--sm" onClick={remove}>
            <i className="ti ti-trash" /> {t('journal.deleteEntry')}
          </button>
        </div>
      </Modal>
    </>
  )
}
