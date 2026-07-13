import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'


function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState(null) // null | 'login' | 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const navigate = useNavigate()

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
      navigate('/dashboard')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
      navigate('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
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
        {/* sinistra: vuota ma bilancia la griglia */}
        <div />

        {/* centro: logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <img src="/logo_obt.png" alt="OBT logo" style={{ height: '40px', width: 'auto' }} />
        </div>

        {/* destra: bottoni auth */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            className="obt-btn obt-btn--ghost obt-btn--sm"
            onClick={() => openMode(mode === 'login' ? null : 'login')}
            style={mode === 'login' ? { borderColor: 'var(--primary)', color: 'var(--primary-dark)' } : {}}
          >
            Accedi
          </button>
          <button
            className="obt-btn obt-btn--primary obt-btn--sm"
            onClick={() => openMode(mode === 'signup' ? null : 'signup')}
          >
            Registrati
          </button>
        </div>
      </header>

      {/* ── Form inline (appare sotto l'header) ── */}
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
              {mode === 'login' ? 'Bentornata/o!' : 'Crea un account'}
            </h2>
            <p style={{
              textAlign: 'center',
              color: 'var(--ink-soft)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}>
              {mode === 'login'
                ? 'Inserisci le tue credenziali per continuare'
                : 'Unisciti alla community di OBT'}
            </p>

            {confirmationSent && (
              <div className="obt-alert obt-alert--success">
                Registrazione quasi completata. Controlla la tua email e clicca sul link di conferma prima di accedere.
              </div>
            )}

            {!confirmationSent && (
              <form onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <div className="obt-field">
                    <label>Username</label>
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
                  <label>Email</label>
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
                  <label>Password</label>
                  <input
                    className="obt-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {error && <div className="obt-alert obt-alert--error">{error}</div>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="obt-btn obt-btn--ghost obt-btn--sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setMode(null)}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="obt-btn obt-btn--primary obt-btn--sm"
                    style={{ flex: 2, justifyContent: 'center' }}
                  >
                    {loading ? 'Attendere…' : mode === 'signup' ? 'Registrati' : 'Accedi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Hero ── */}
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
          Traccia i tuoi progetti di breeding, gestisci le coppie e avvicinati
          al colore target — tutto in un posto solo.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="obt-btn obt-btn--primary"
            onClick={() => openMode('signup')}
          >
            Inizia gratis
          </button>
          <button
            className="obt-btn obt-btn--ghost"
            onClick={() => openMode('login')}
          >
            Ho già un account
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
          {[
            { icon: '🥚', label: 'Gestisci starter' },
            { icon: '🎨', label: 'Distanza cromatica' },
            { icon: '🔗', label: 'Coppie & figli' },
            { icon: '🎯', label: 'Colore target' },
          ].map(({ icon, label }) => (
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
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>
      </main>

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