// src/pages/JournalEntry.jsx
// Vista in sola LETTURA di una nota. URL proprio -> condivisibile via link.
// La modifica avviene nell'editor a pagina intera (/journal/:id/edit), non qui:
// il tasto Modifica ci naviga. Delete resta qui come azione diretta dell'owner.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { Markdown } from './markdown'
import { useConfirm } from './ConfirmDialog'

export default function JournalEntry() {
  const { t, formatDate } = useT()
  const { entryId } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { confirm, dialog } = useConfirm()

  useEffect(() => { load() }, [entryId])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('journal').select('*').eq('id', entryId).maybeSingle()
    setEntry(data || null)
    setIsOwner(!!(data && user && data.owner_id === user.id))
    setLoading(false)
  }

  const remove = () => confirm({
    message: t('journal.deleteConfirm'), danger: true,
    onConfirm: async () => {
      const { error } = await supabase.from('journal').delete().eq('id', entry.id)
      if (error) { setError(t('journal.saveError')); return }
      navigate('/journal')
    },
  })

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
              <>
                <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate(`/journal/${entryId}/edit`)}>
                  <i className="ti ti-pencil" /> {t('common.edit')}
                </button>
                <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={remove}>
                  <i className="ti ti-trash" /> {t('common.delete')}
                </button>
              </>
            )}
          </div>
          <div className="obt-hero-title">
            <h1>{entry.title || t('journal.untitled')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">
              {formatDate(entry.created_at)}
              {entry.visibility !== 'private' && <> · <i className="ti ti-link" /> {t('visibility.unlisted')}</>}
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
      {dialog}
    </>
  )
}
