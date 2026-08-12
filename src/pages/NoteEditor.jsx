// src/pages/NoteEditor.jsx
// Editor NOTA a pagina intera (crea + modifica). Rimpiazza il vecchio modal.
//   /journal/new          -> creazione
//   /journal/:entryId/edit -> modifica
// Il salvataggio è esplicito (tasto Salva); niente ibrido qui — una nota è
// testo, si scrive e si salva in un colpo.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { MarkdownToolbar } from './markdown'
import VisibilityToggle from './VisibilityToggle'

const parseTags = (raw) =>
  (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default function NoteEditor() {
  const { t } = useT()
  const { entryId } = useParams()      // undefined => creazione
  const navigate = useNavigate()
  const isNew = !entryId

  const [form, setForm] = useState({ title: '', description: '', body: '', tags: '', visibility: 'private' })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const bodyRef = useRef(null)

  const shareUrl = entryId ? `${window.location.origin}/journal/${entryId}` : ''

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('journal').select('*').eq('id', entryId).maybeSingle()
      // solo l'owner può editare
      if (!data || !user || data.owner_id !== user.id) { setNotFound(true); setLoading(false); return }
      setForm({
        title: data.title || '',
        description: data.description || '',
        body: data.body || '',
        tags: (data.tags || []).join(', '),
        visibility: data.visibility || 'private',
      })
      setLoading(false)
    })()
  }, [entryId, isNew])

  const save = async () => {
    setError('')
    if (!form.body.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      body: form.body.trim(),
      tags: parseTags(form.tags),
      visibility: form.visibility,
    }
    if (isNew) {
      const { data, error } = await supabase.from('journal')
        .insert({ ...payload, owner_id: user.id }).select('id').single()
      if (error) { setError(t('journal.saveError')); setSaving(false); return }
      navigate(`/journal/${data.id}`)
    } else {
      const { error } = await supabase.from('journal').update(payload).eq('id', entryId)
      if (error) { setError(t('journal.saveError')); setSaving(false); return }
      navigate(`/journal/${entryId}`)
    }
  }

  const cancel = () => navigate(isNew ? '/journal' : `/journal/${entryId}`)

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (notFound) return (
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
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={cancel}>&larr; {t('common.cancel')}</button>
          </div>
          <div className="obt-hero-title">
            <h1>{isNew ? t('journal.newNote') : t('journal.editTitle')}</h1>
          </div>
          <div className="obt-hero-info" />
        </div>
      </div>

      <div className="obt-page obt-page--narrow">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}

        <div className="obt-panel">
          <div className="obt-field">
            <label>{t('journal.entryTitle')} <span className="obt-optional">{t('common.optional')}</span></label>
            <input className="obt-input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder={t('journal.titlePlaceholder')} />
          </div>

          <div className="obt-field">
            <label>{t('journal.description')} <span className="obt-optional">{t('common.optional')}</span></label>
            <input className="obt-input" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={t('journal.descriptionPlaceholder')} />
            <div className="obt-hint">{t('journal.descriptionHint')}</div>
          </div>

          <div className="obt-field">
            <label>{t('journal.body')} *</label>
            <MarkdownToolbar value={form.body} textareaRef={bodyRef}
              onChange={v => setForm({ ...form, body: v })} />
            <textarea ref={bodyRef} className="obt-textarea" rows={16} value={form.body}
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

          <div className="obt-field" style={{ borderTop: '0.5px solid var(--line)', paddingTop: 14 }}>
            <label>{t('visibility.label')}</label>
            <VisibilityToggle
              value={form.visibility}
              onChange={v => setForm({ ...form, visibility: v })}
              variant="full"
              shareUrl={shareUrl}
            />
          </div>

          <div className="obt-actions">
            <button className="obt-btn obt-btn--primary" onClick={save} disabled={!form.body.trim() || saving}>
              {saving ? t('common.loading') : (isNew ? t('common.create') : t('common.saveChanges'))}
            </button>
            <button className="obt-btn obt-btn--ghost" onClick={cancel}>{t('common.cancel')}</button>
          </div>
        </div>
      </div>
    </>
  )
}
