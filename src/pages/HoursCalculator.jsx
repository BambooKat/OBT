import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n'

// Calcolatore ore uova: dato il tempo totale di gestazione e una percentuale,
// dice quante ore corrispondono a quella % (passato) oppure quante ne mancano
// (rimanente). Nessun calcolo automatico: si immettono i dati e si legge il
// risultato. Popover ancorato all'header, sullo stampo di ThemeSwitcher.
function HoursCalculator() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [total, setTotal] = useState('')
  const [percent, setPercent] = useState('')
  const [mode, setMode] = useState('elapsed') // 'elapsed' | 'remaining'
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

  const tot = parseFloat(total)
  const pct = parseFloat(percent)
  const valid = tot > 0 && pct >= 0 && pct <= 100

  const elapsedH = valid ? (pct / 100) * tot : null
  const resultH = !valid ? null : (mode === 'elapsed' ? elapsedH : tot - elapsedH)

  const fmt = (h) => {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    return `${h.toFixed(2)}h · ${hh}h ${mm}m`
  }

  const inputStyle = {
    width: '100%', padding: '7px 9px', fontSize: 13, fontFamily: 'inherit',
    background: 'var(--bg)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
  }
  const labelStyle = {
    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '.04em', color: 'var(--ink-soft)',
    display: 'block', marginBottom: 4,
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('hours.title')}
        title={t('hours.title')}
        className="obt-btn obt-btn--ghost obt-btn--sm"
      >
        <i className="ti ti-clock" />
        <span style={{ fontSize: 10, opacity: .7 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('hours.title')}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
            padding: 12, width: 240,
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hover)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="obt-hours-total">{t('hours.total')}</label>
              <input
                id="obt-hours-total" type="number" min="0" step="0.1"
                value={total} onChange={(e) => setTotal(e.target.value)}
                placeholder="0" style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="obt-hours-pct">{t('hours.percent')}</label>
              <input
                id="obt-hours-pct" type="number" min="0" max="100" step="0.1"
                value={percent} onChange={(e) => setPercent(e.target.value)}
                placeholder="0" style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['elapsed', 'remaining'].map((key) => {
              const active = key === mode
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  style={{
                    flex: 1, padding: '7px 8px', cursor: 'pointer',
                    border: `2px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'var(--primary-light)' : 'transparent',
                    color: active ? 'var(--primary-dark)' : 'var(--ink-soft)',
                    fontWeight: active ? 800 : 600, fontSize: 12, fontFamily: 'inherit',
                  }}
                >
                  {t(`hours.${key}`)}
                </button>
              )
            })}
          </div>

          <div style={{
            padding: '9px 10px', textAlign: 'center',
            background: 'var(--primary-light)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
          }}>
            {valid
              ? <strong style={{ fontSize: 14, color: 'var(--primary-dark)' }}>{fmt(resultH)}</strong>
              : <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('hours.hint')}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default HoursCalculator
