// src/pages/HeaderNav.jsx
// Pill informative dell'header, condivise tra la landing (Login) e l'app
// loggata (Layout). UNICO posto in cui vivono lingua, tema, Guida/FAQ e Novità:
// modifichi qui e cambiano ovunque.
//
// Il badge Novità si auto-gestisce: legge l'utente da solo (loggato o anonimo)
// e ricontrolla al cambio pagina, così né Login né Layout devono passargli nulla.

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { supabase } from '../supabaseClient'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import { hasUnread } from './newsUtils'

export default function HeaderNav() {
  const { t } = useT()
  const location = useLocation()
  const [unread, setUnread] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const v = await hasUnread(user?.id || null)
      if (alive) setUnread(v)
    })()
    return () => { alive = false }
  }, [location.pathname])

  return (
    <>
      <LanguageSwitcher />
      <ThemeSwitcher />
      <Link to="/guide" className="obt-btn obt-btn--ghost obt-btn--sm" style={{ textDecoration: 'none' }}>
        <i className="ti ti-book" /> {t('layout.guideFaq')}
      </Link>
      <Link to="/news" className="obt-btn obt-btn--ghost obt-btn--sm"
        style={{ textDecoration: 'none', position: 'relative' }}>
        <i className="ti ti-speakerphone" /> {t('layout.news')}
        {unread && (
          <span aria-label={t('layout.newsUnread')} style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--primary)', boxShadow: '0 0 0 2px var(--card)',
          }} />
        )}
      </Link>
    </>
  )
}
