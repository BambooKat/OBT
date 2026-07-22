import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { CONTACT_EMAIL } from '../config'
import LanguageSwitcher from './LanguageSwitcher'

function Login() {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState(null) // null | 'login' | 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Se l'utente e' arrivato da un link condiviso, dopo il login lo riportiamo li'
  // invece che sulla dashboard.
  const redirectTo = location.pathname.startsWith('/project/') ? location.pathname : '/dashboard'

  const openMode = (m) => {
    setMode(m)
    setError('')
    setConfirmationSent(false)
    setEmail('')
    setPassword('')
    setUsername('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      if (data.user && !data.session) { setLoading(false); setConfirmationSent(true); return }
      navigate(redirectTo)
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
      navigate(redirectTo)
    }
  }

  const features = [
    { icon: <i className="ti ti-wand"></i>, label: t('login.features.starters') },
    { icon: <i className="ti ti-color-filter"></i>, label: t('login.features.distance') },
    { icon: <i className="ti ti-dna"></i>, label: t('login.features.pairs') },
    { icon: <i className="ti ti-target-arrow"></i>, label: t('login.features.target') },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--line)',
        padding: '0 32px',
        height: '64px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <LanguageSwitcher />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <img src="/logo_obt.png" alt="OBT logo" style={{ height: '40px', width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            className="obt-btn obt-btn--ghost obt-btn--sm"
            onClick={() => openMode(mode === 'login' ? null : 'login')}
            style={mode === 'login' ? { borderColor: 'var(--primary)', color: 'var(--primary-dark)' } : {}}
          >
            {t('login.signIn')}
          </button>
          <button
            className="obt-btn obt-btn--primary obt-btn--sm"
            onClick={() => openMode(mode === 'signup' ? null : 'signup')}
          >
            {t('login.signUp')}
          </button>
        </div>
      </header>

      {/* Form inline */}
      {mode && (
        <div style={{
          background: 'var(--card)',
          borderBottom: '2px solid var(--line)',
          display: 'flex',
          justifyContent: 'center',
          padding: '28px 24px',
          animation: 'obt-slide-down .18s ease',
        }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              marginBottom: '4px',
              textAlign: 'center',
            }}>
              {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
            </h2>
            <p style={{
              textAlign: 'center',
              color: 'var(--ink-soft)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}>
              {mode === 'login' ? t('login.signInSub') : t('login.signUpSub')}
            </p>

            {confirmationSent && (
              <div className="obt-alert obt-alert--success">
                {t('login.confirmationSent')}
              </div>
            )}

            {!confirmationSent && (
              <form onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <div className="obt-field">
                    <label>{t('login.username')}</label>
                    <input
                      className="obt-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                )}

                <div className="obt-field">
                  <label>{t('login.email')}</label>
                  <input
                    className="obt-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus={mode === 'login'}
                  />
                </div>

                <div className="obt-field">
                  <label>{t('login.password')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="obt-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                        fontSize: 15, lineHeight: 1, color: 'var(--muted)',
                      }}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {error && <div className="obt-alert obt-alert--error">{error}</div>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="obt-btn obt-btn--ghost obt-btn--sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setMode(null)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="obt-btn obt-btn--primary obt-btn--sm"
                    style={{ flex: 2, justifyContent: 'center' }}
                  >
                    {loading ? t('login.pleaseWait') : mode === 'signup' ? t('login.signUp') : t('login.signIn')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        textAlign: 'center',
      }}>
        <img
          src="/logo_obt.png"
          alt="OBT mascot"
          style={{ width: '690px', height: 'auto', marginBottom: '28px' }}
        />
        <p style={{
          color: 'var(--ink-soft)',
          fontSize: '16px',
          fontWeight: 600,
          maxWidth: '480px',
          lineHeight: 1.6,
          marginBottom: '32px',
        }}>
          {t('login.heroText')}
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="obt-btn obt-btn--primary"
            onClick={() => openMode('signup')}
          >
            {t('login.startFree')}
          </button>
          <button
            className="obt-btn obt-btn--ghost"
            onClick={() => openMode('login')}
          >
            {t('login.haveAccount')}
          </button>
        </div>

        {/* pillole feature */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '48px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {features.map(({ icon, label }) => (
            <div key={label} style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-pill)',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--ink-soft)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: 'var(--shadow)',
            }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span> {label}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--card)',
        padding: '16px 32px',
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--muted)',
        marginTop: 'auto'
      }}>
        {t('layout.tagline')} ·{' '}
        <a 
          href={`mailto:${CONTACT_EMAIL}?subject=OBT%20Tool`} 
          style={{ color: 'var(--primary)', textDecoration: 'none' }}
        >
          {t('layout.contact')}
        </a>
        {' '}·{' '}
        <a 
          href="https://ovipets.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: 'var(--muted)', textDecoration: 'none' }}
        >
          Ovipets.com
        </a>
      </footer>

      <style>{`
        @keyframes obt-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Login