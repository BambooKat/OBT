import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n'

// Codice lingua + menu a tendina. Si popola da solo leggendo LANGUAGES,
// quindi aggiungere una lingua non richiede di toccare questo file.
function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useT()
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  // Chiude cliccando fuori o con Esc.
  useEffect(() => {
    if (!open) return
    const onClickAway = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = languages[lang]

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('layout.language')}
        title={t('layout.language')}
        className="obt-btn obt-btn--ghost obt-btn--sm"
      >
        <span style={{ letterSpacing: '.5px' }}>{current?.flag}</span>
        <span style={{ fontSize: 10, opacity: .7 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
            listStyle: 'none', margin: 0, padding: 4, minWidth: 150,
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
          }}
        >
          {Object.entries(languages).map(([code, { label, flag }]) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === lang}
                onClick={() => { setLang(code); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', border: 'none', cursor: 'pointer',
                  borderRadius: 'calc(var(--radius) - 4px)', textAlign: 'left',
                  background: code === lang ? 'var(--bg)' : 'transparent',
                  color: code === lang ? 'var(--primary-dark)' : 'var(--ink-soft)',
                  fontWeight: code === lang ? 800 : 600,
                  fontSize: 13, fontFamily: 'inherit',
                }}
              >
                <span style={{
                  minWidth: 22, letterSpacing: '.5px',
                  color: code === lang ? 'var(--primary-dark)' : 'var(--muted)',
                }}>{flag}</span>
                {label}
                {code === lang && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default LanguageSwitcher