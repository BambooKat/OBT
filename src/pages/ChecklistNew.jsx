// src/pages/ChecklistNew.jsx
// Crea al volo una checklist "bozza" vuota e reindirizza al suo editor
// (ChecklistPage in modalità owner). L'inserimento vero avviene lì, inline.
// La bozza è già salvata: se l'utente abbandona resta una checklist vuota,
// eliminabile — trade-off accettato al posto dell'ibrido puro in memoria.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'

export default function ChecklistNew() {
  const { t } = useT()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return   // evita doppia creazione in StrictMode
    started.current = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/journal'); return }
      const { data, error } = await supabase.from('journal_checklists').insert({
        owner_id: user.id,
        title: t('checklist.untitledNew'),
        visibility: 'private',
      }).select('id').single()
      if (error) { setError(t('checklist.saveError')); return }
      navigate(`/journal/checklist/${data.id}`, { replace: true })
    })()
  }, [navigate, t])

  if (error) return (
    <div className="obt-page">
      <div className="obt-alert obt-alert--error">{error}</div>
      <button className="obt-btn obt-btn--primary" onClick={() => navigate('/journal')}>&larr; {t('checklist.back')}</button>
    </div>
  )
  return <div className="obt-loading">{t('common.loading')}</div>
}
