import { useState, useEffect } from 'react'
import { useT } from '../i18n'
import Modal from './Modal'
import { todayISO, petLabel } from './petUtils'

const cooldownFor = (femaleId, pairs, hours) => {
  // l'ora si legge qui, non da uno state: il tick serve solo a forzare il ridisegno
  const now = Date.now()
  if (!hours) return null
  let best = null, exact = false
  for (const p of pairs) {
    if ((p.mother?.id || p.mother_id) !== femaleId) continue
    const isExact = !!p.pair_at
    const m = p.pair_at ? new Date(p.pair_at)
      : (p.pair_date ? new Date(p.pair_date + 'T00:00:00') : null)
    if (m && !isNaN(m) && (!best || m > best)) { best = m; exact = isExact }
  }
  if (!best) return null
  const msLeft = best.getTime() + hours * 3600000 - now
  return { msLeft, ready: msLeft <= 0, exact }
}

const CooldownBadge = ({ info }) => {
  const { t } = useT()
  if (!info) return null
  if (info.ready) {
    return (
      <span title={t('project.cooldown.readyTitle')} style={{
        marginLeft: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      }}>💚</span>
    )
  }
  const h = info.msLeft / 3600000
  const label = h >= 48 ? `${Math.ceil(h / 24)}g` : h >= 1 ? `${Math.ceil(h)}h` : `${Math.ceil(info.msLeft / 60000)}m`
  return (
    <span title={t('project.cooldown.waitTitle')} style={{
      marginLeft: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--muted)',
    }}>💙 {info.exact ? '±' : '⁓'} {label}</span>
  )
}

function PairCellModal({ open, onClose, pair, female, male, round, onSave, onDelete, isOwner }) {
  const { t } = useT()
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [childCode, setChildCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(pair?.pair_date || todayISO())
      setNotes(pair?.outcome_notes || '')
      setChildCode('')
    }
  }, [open, pair])

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    await onSave({ date, notes, childCode })
    setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    await onDelete()
    setSaving(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pair
        ? `${t('project.pairs.editPair')}: ${petLabel(female)} × ${petLabel(male)}`
        : `${t('project.pairs.newPair')}: ${petLabel(female)} × ${petLabel(male)}`
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); if (isOwner) handleSave() }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="obt-label">{t('project.pairs.roundLabel')} {round}</label>
          </div>
        </div>
        <div className="obt-field">
          <label>{t('project.pairs.date')}</label>
          <input type="date" className="obt-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="obt-field">
          <label>{t('project.pairs.outcome')}</label>
          <input className="obt-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('project.pairs.notesPlaceholder')} />
        </div>
        <div className="obt-field" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <label><i className="ti ti-egg" /> {t('project.pairs.addChildCode')}</label>
          <input className="obt-input" value={childCode} onChange={e => setChildCode(e.target.value)} placeholder={t('project.pairs.childCodePlaceholder')} />
          <p className="obt-hint" style={{ marginTop: 4 }}>{t('project.pairs.childHint')}</p>
        </div>
        <div className="obt-actions" style={{ marginTop: 4 }}>
          {isOwner && (
            <button type="submit" className="obt-btn obt-btn--primary" disabled={saving}>
              {saving ? t('common.loading') : (pair ? t('common.saveChanges') : t('project.pairs.submit'))}
            </button>
          )}
          {isOwner && pair && (
            <button type="button" className="obt-btn obt-btn--danger obt-btn--sm" onClick={handleDelete} disabled={saving}>
              {t('common.delete')}
            </button>
          )}
          <button type="button" className="obt-btn obt-btn--ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Componente griglia ----
function CooldownLegend() {
  const { t } = useT()
  const Row = ({ icon, text }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
      <span style={{ width: 34, flexShrink: 0, fontSize: 12 }}>{icon}</span>
      <span className="obt-text-soft" style={{ fontSize: 12 }}>{text}</span>
    </div>
  )
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
      padding: '10px 12px', margin: '14px auto 0', maxWidth: 520, textAlign: 'left',
    }}>
      <Row icon="💚" text={t('project.cooldown.legendReady')} />
      <Row icon="💙 ±" text={t('project.cooldown.legendExact')} />
      <Row icon="💙 ⁓" text={t('project.cooldown.legendApprox')} />
    </div>
  )
}

function PairGrid({ round, females, males, pairsInRound, onCellClick, isOwner, forbidden = {}, allPairs = [], cooldownHours = null, now = 0 }) {
  const { t } = useT()
  // mappa fId:mId -> pair
  const cellMap = {}
  pairsInRound.forEach(p => {
    const fId = p.mother?.id || p.mother_id
    const mId = p.father?.id || p.father_id
    if (fId && mId) cellMap[`${fId}:${mId}`] = p
  })

  if (females.length === 0 || males.length === 0) {
    return <p className="obt-text-soft" style={{ fontSize: 13, padding: '8px 0' }}>{t('project.pairs.gridNeedBoth')}</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 300, margin: '0 auto' }}>
        <thead>
          <tr>
            <th style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 700,
              color: 'var(--muted)', textAlign: 'left', background: 'transparent',
            }}>♀ \ ♂</th>
            {males.map(m => (
              <th key={m.id} style={{
                padding: '6px 10px', fontSize: 16, fontWeight: 700,
                color: 'var(--ink)', textAlign: 'center', background: 'transparent',
                whiteSpace: 'nowrap',
              }}>
                {m.code && <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{m.code}</span>}
                {m.code && ' '}
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{m.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {females.map(f => (
            <tr key={f.id}>
              <td style={{
                padding: '6px 12px', fontSize: 16, fontWeight: 600,
                whiteSpace: 'nowrap', color: 'var(--ink)',
              }}>
                {f.code && <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{f.code}</span>}
                {f.code && ' '}
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{f.name}</span>
                <CooldownBadge info={cooldownFor(f.id, allPairs, cooldownHours)} />
              </td>
              {males.map(m => {
                const pair = cellMap[`${f.id}:${m.id}`]
                const done = !!pair
                const forb = !done ? forbidden[`${f.id}:${m.id}`] : null
                if (forb) {
                  return (
                    <td key={m.id} style={{ padding: 2, textAlign: 'center' }}>
                      <div title={forb.label} style={{
                        width: 52, height: 36, borderRadius: 8,
                        border: '2px solid var(--bad-text)',
                        background: 'var(--bg)', color: 'var(--muted)',
                        cursor: 'not-allowed', opacity: 0.7,
                        fontSize: 18, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>·</div>
                    </td>
                  )
                }
                return (
                  <td key={m.id} style={{ padding: 2, textAlign: 'center' }}>
                    <button
                      onClick={() => onCellClick(f, m, pair)}
                      disabled={!isOwner && !done}
                      title={done
                        ? (pair.outcome_notes || `${petLabel(f)} × ${petLabel(m)}`)
                        : (isOwner ? t('project.pairs.cellRegister') : '')
                      }
                      style={{
                        width: 52, height: 36, borderRadius: 8,
                        border: done ? '2px solid var(--primary)' : '2px dashed var(--line)',
                        background: done ? 'var(--primary)' : 'var(--surface)',
                        color: done ? '#fff' : 'var(--muted)',
                        cursor: isOwner ? 'pointer' : (done ? 'default' : 'not-allowed'),
                        fontSize: done ? 16 : 20, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', flexShrink: 0,
                      }}
                    >
                      {done ? '✓' : '·'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {cooldownHours ? <CooldownLegend /> : null}
    </div>
  )
}

export default PairGrid
export { PairCellModal, CooldownLegend, CooldownBadge, cooldownFor }
