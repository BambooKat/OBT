import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n'
import { modes } from '../styles/modes.js'
import { accents } from '../styles/accents.js'
import { applyTheme, getSavedMode, getSavedAccent } from '../styles/theme.js'

// Selettore tema: modalità (chiaro/scuro) + accento.
// Si popola da solo da modes.js / accents.js, quindi aggiungere una
// skin non richiede di toccare questo file.
function ThemeSwitcher() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(getSavedMode)
  const [accent, setAccent] = useState(getSavedAccent)
  const boxRef = useRef(null)

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

  const pick = (nextMode, nextAccent) => {
    applyTheme(nextMode, nextAccent)
    setMode(nextMode)
    setAccent(nextAccent)
  }

  const isDark = modes[mode]?.['--theme-type'] === 'dark'

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('layout.theme')}
        title={t('layout.theme')}
        className="obt-btn obt-btn--ghost obt-btn--sm"
      >
        <i className={isDark ? 'ti ti-moon' : 'ti ti-sun'} />
        <span style={{
          width: 12, height: 12, borderRadius: '50%',
          background: accents[accent]?.['--primary'], display: 'inline-block',
        }} />
        <span style={{ fontSize: 10, opacity: .7 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
            padding: 12, minWidth: 190,
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hover)',
          }}
        >
          {/* Modalità */}
          <div style={{
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '.04em', color: 'var(--ink-soft)', marginBottom: 8,
          }}>{t('layout.themeMode')}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {Object.entries(modes).map(([key, m]) => {
              const active = key === mode
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key, accent)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '8px 10px', cursor: 'pointer',
                    border: `2px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'var(--primary-light)' : 'transparent',
                    color: active ? 'var(--primary-dark)' : 'var(--ink-soft)',
                    fontWeight: active ? 800 : 600, fontSize: 13, fontFamily: 'inherit',
                  }}
                >
                  <i className={m['--theme-type'] === 'dark' ? 'ti ti-moon' : 'ti ti-sun'} />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Accento */}
          <div style={{
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '.04em', color: 'var(--ink-soft)', marginBottom: 8,
          }}>{t('layout.themeAccent')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(accents).map(([key, a]) => {
              const active = key === accent
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(mode, key)}
                  aria-label={a.label}
                  title={a.label}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                    background: a['--primary'],
                    border: `2px solid ${active ? 'var(--ink)' : 'transparent'}`,
                    boxShadow: active ? '0 0 0 2px var(--card) inset' : 'none',
                    padding: 0,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeSwitcher
