import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n'
import {
  SPECIES_LIST, VARIANTS, ROTATION_CHECKPOINTS, INTERVALS, hoursPerTurn,
} from '../data/incubation'

// Egg Timer — popover con due modalità (toggle in cima):
//  • Timer: specie + variante + orario del click a 0% → orari dei checkpoint
//    ai quarti (0/25/50/75%) e schiusa (100%) + countdown.
//  • Da %:  specie + variante + % attuale → ore trascorse e ore mancanti.
// Modello: gestazione_totale = ore_per_turno × 4. I quarti sono equidistanti in
// tempo e in %, quindi il tempo è LINEARE nella %: ore = (% / 100) × totale.
function HoursCalculator() {
  const { t, lang } = useT()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('timer') // 'timer' | 'percent'
  const [species, setSpecies] = useState(SPECIES_LIST[0] || '')
  const [variant, setVariant] = useState('reg5')
  const [startAt, setStartAt] = useState('') // datetime-local; vuoto = adesso
  const [percent, setPercent] = useState('') // modalità Da %
  const [, setNow] = useState(Date.now())    // tick countdown
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickAway = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onKey)
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onKey)
      clearInterval(tick)
    }
  }, [open])

  const hpt = hoursPerTurn(species, variant)
  const totalHours = hpt != null ? hpt * INTERVALS : null

  // --- Modalità Timer ---
  const start = startAt ? new Date(startAt) : new Date()
  const startValid = !isNaN(start.getTime())
  const rows = (totalHours != null && startValid)
    ? ROTATION_CHECKPOINTS.map((pct, i) => ({
        pct,
        when: new Date(start.getTime() + (totalHours * (i / INTERVALS)) * 3600000),
        hatch: pct === 100,
      }))
    : []
  const hatchAt = rows.length ? rows[rows.length - 1].when : null
  const msLeft = hatchAt ? hatchAt.getTime() - Date.now() : null

  // --- Modalità Da % ---
  const pct = parseFloat(percent)
  const pctValid = totalHours != null && pct >= 0 && pct <= 100
  const elapsedH = pctValid ? (pct / 100) * totalHours : null
  const remainingH = pctValid ? totalHours - elapsedH : null

  const locale = lang === 'it' ? 'it-IT' : 'en-GB'
  const fmtWhen = (d) =>
    d.toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  const fmtDur = (h) => {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    return `${hh}h ${mm}m`
  }
  const fmtLeft = (ms) => {
    if (ms == null) return '—'
    if (ms <= 0) return t('hours.ready')
    return fmtDur(ms / 3600000)
  }

  const labelStyle = {
    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '.04em', color: 'var(--ink-soft)',
    display: 'block', marginBottom: 4,
  }
  const fieldStyle = {
    width: '100%', padding: '7px 9px', fontSize: 13, fontFamily: 'inherit',
    background: 'var(--bg)', color: 'var(--ink)',
    border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
  }
  const tabStyle = (active) => ({
    flex: 1, padding: '7px 8px', cursor: 'pointer',
    border: `2px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--primary-light)' : 'transparent',
    color: active ? 'var(--primary-dark)' : 'var(--ink-soft)',
    fontWeight: active ? 800 : 600, fontSize: 12, fontFamily: 'inherit',
  })

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
        <i className="ti ti-egg" /> {t('hours.title')}
        <span style={{ fontSize: 10, opacity: .7 }}>{open ? '\u25B4' : '\u25BE'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('hours.title')}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
            padding: 14, width: 280,
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hover)',
          }}
        >
          {/* Toggle modalità */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button type="button" onClick={() => setMode('timer')} style={tabStyle(mode === 'timer')}>
              {t('hours.modeTimer')}
            </button>
            <button type="button" onClick={() => setMode('percent')} style={tabStyle(mode === 'percent')}>
              {t('hours.modePercent')}
            </button>
          </div>

          {/* Comune: specie + variante */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="obt-egg-species">{t('hours.species')}</label>
              <select id="obt-egg-species" value={species}
                onChange={(e) => setSpecies(e.target.value)} style={fieldStyle}>
                {SPECIES_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="obt-egg-variant">{t('hours.variant')}</label>
              <select id="obt-egg-variant" value={variant}
                onChange={(e) => setVariant(e.target.value)} style={fieldStyle}>
                {VARIANTS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {hpt == null ? (
            <div style={{
              padding: '9px 10px', textAlign: 'center', fontSize: 12,
              color: 'var(--muted)', background: 'var(--primary-light)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--line)',
            }}>
              {t('hours.noData')}
            </div>
          ) : mode === 'timer' ? (
            <>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle} htmlFor="obt-egg-start">{t('hours.startAt')}</label>
                <input id="obt-egg-start" type="datetime-local" value={startAt}
                  onChange={(e) => setStartAt(e.target.value)} style={fieldStyle} />
                <button type="button" onClick={() => setStartAt('')}
                  style={{
                    marginTop: 5, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
                    background: 'transparent', border: 'none', padding: 0,
                    color: 'var(--primary)', textDecoration: 'underline',
                  }}>
                  {t('hours.useNow')}
                </button>
              </div>

              <div style={{
                border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
                overflow: 'hidden', marginBottom: 10,
              }}>
                {rows.map((r) => (
                  <div key={r.pct} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', fontSize: 12,
                    background: r.hatch ? 'var(--primary-light)' : 'transparent',
                    borderTop: r.pct === 0 ? 'none' : '1px solid var(--line)',
                    fontWeight: r.hatch ? 800 : 600,
                    color: r.hatch ? 'var(--primary-dark)' : 'var(--ink)',
                  }}>
                    <span>
                      {r.hatch
                        ? <><i className="ti ti-egg-cracked" /> {t('hours.hatch')}</>
                        : `${t('hours.turn')} ${r.pct}%`}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtWhen(r.when)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)' }}>
                <span>{t('hours.total')}: <strong style={{ color: 'var(--ink)' }}>{totalHours}h</strong></span>
                <span>{t('hours.left')}: <strong style={{ color: 'var(--primary-dark)' }}>{fmtLeft(msLeft)}</strong></span>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle} htmlFor="obt-egg-pct">{t('hours.percent')}</label>
                <input id="obt-egg-pct" type="number" min="0" max="100" step="0.1"
                  value={percent} onChange={(e) => setPercent(e.target.value)}
                  placeholder="0" style={fieldStyle} />
              </div>

              {pctValid ? (
                <div style={{
                  border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-soft)' }}>{t('hours.elapsed')}</span>
                    <strong style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(elapsedH)}</strong>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '7px 10px', fontSize: 12,
                    background: 'var(--primary-light)', borderTop: '1px solid var(--line)',
                  }}>
                    <span style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>{t('hours.remaining')}</span>
                    <strong style={{ color: 'var(--primary-dark)', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(remainingH)}</strong>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '9px 10px', textAlign: 'center', fontSize: 12, color: 'var(--muted)',
                  background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)',
                }}>
                  {t('hours.hint')}
                </div>
              )}

              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-soft)' }}>
                {t('hours.total')}: <strong style={{ color: 'var(--ink)' }}>{totalHours}h</strong>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default HoursCalculator
