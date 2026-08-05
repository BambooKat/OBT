// src/pages/News.jsx
// Pagina Novità: annunci dello staff sull'evoluzione di OBT.
// Sola lettura per tutti (pubblica): il contenuto lo scrive solo lo staff via
// SQL. Testo bilingue — mostra la lingua attiva, con fallback su IT se manca
// la versione EN. Aprendo la pagina, segna "letto" (DB se loggato, localStorage
// se anonimo), così il badge nell'header si spegne.

import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { Markdown } from './markdown'
import { fetchPublishedAnnouncements, markRead } from './newsUtils'

// Sceglie il campo giusto per la lingua, con fallback: EN→IT, IT→EN.
const pick = (a, field, lang) => {
  const primary = a[`${field}_${lang}`]
  if (primary && primary.trim()) return primary
  const other = lang === 'it' ? a[`${field}_en`] : a[`${field}_it`]
  return other || ''
}

export default function News() {
  const { t, lang, formatDate } = useT()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const data = await fetchPublishedAnnouncements()
      if (!alive) return
      setItems(data)
      setLoading(false)
      // Segna letto: recupera l'utente (può non esserci → anonimo).
      const { data: { user } } = await supabase.auth.getUser()
      markRead(user?.id || null)
    })()
    return () => { alive = false }
  }, [])

  return (
    <>
      <div className="obt-hero">
        <h1>{t('news.title')}</h1>
        <div className="obt-hero-sub">{t('news.hint')}</div>
      </div>
      <div className="obt-page">

      {loading ? (
        <div className="obt-loading">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="obt-panel obt-empty">
          <div className="obt-empty-icon"><i className="ti ti-speakerphone" /></div>
          <h3>{t('news.empty')}</h3>
        </div>
      ) : (
        items.map(a => {
          const title = pick(a, 'title', lang)
          const body = pick(a, 'body', lang)
          return (
            <div key={a.id} className="obt-panel">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                {a.pinned && (
                  <span title={t('news.pinned')} style={{ color: 'var(--primary)' }}>
                    <i className="ti ti-pin" />
                  </span>
                )}
                <h3 style={{ margin: 0 }}>{title || t('news.untitled')}</h3>
                <span className="obt-text-soft" style={{ fontSize: 12 }}>
                  {formatDate(a.created_at)}
                </span>
              </div>
              <Markdown text={body} />
            </div>
          )
        })
      )}
      </div>
    </>
  )
}
