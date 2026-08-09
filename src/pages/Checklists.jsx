// src/pages/Checklists.jsx
// Elenco delle checklist di collezione (tracklist). Ogni checklist ha un titolo,
// una descrizione opzionale e una visibilità (Privato / Linkabile). Il dettaglio,
// con gruppi e item, sta in ChecklistPage.
//
// Il progresso (quanti item completi su totale) è calcolato lato client: non c'è
// nessuna colonna derivata da mantenere. Regola: item pair completo = M && F;
// single completo = have_single.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'
import VisibilityToggle from './VisibilityToggle'

export default function Checklists() {
  const { t, formatDate } = useT()
  const [lists, setLists] = useState([])
  const [progress, setProgress] = useState({}) // { checklist_id: { done, total } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', visibility: 'private' })

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: cls, error: e1 } = await supabase
      .from('journal_checklists')
      .select('*')
      .eq('owner_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
    if (e1) { setError(t('checklist.loadError')); setLoading(false); return }

    // conteggio progresso: una sola query su tutti gli item delle proprie liste
    const ids = (cls || []).map(c => c.id)
    let prog = {}
    if (ids.length) {
      const { data: items } = await supabase
        .from('journal_checklist_items')
        .select('checklist_id, mode, have_single, have_m, have_f')
        .in('checklist_id', ids)
      ;(items || []).forEach(it => {
        const done = it.mode === 'pair' ? (it.have_m && it.have_f) : it.have_single
        const p = prog[it.checklist_id] || { done: 0, total: 0 }
        p.total += 1
        if (done) p.done += 1
        prog[it.checklist_id] = p
      })
    }

    setLists(cls || [])
    setProgress(prog)
    setLoading(false)
  }

  const openNew = () => {
    setForm({ title: '', description: '', visibility: 'private' })
    setShowForm(true)
  }

  const save = async () => {
    setError('')
    if (!form.title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('journal_checklists').insert({
      owner_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      visibility: form.visibility,
    })
    if (error) { setError(t('checklist.saveError')); return }
    setShowForm(false)
    load()
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={openNew}>
              + {t('checklist.new')}
            </button>
          </div>
          <div className="obt-hero-title">
            <h1>{t('checklist.title')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">{t('checklist.subtitle')}</p>
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('checklist.count')}</span> {lists.length}
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}

        {lists.length === 0 ? (
          <div className="obt-panel obt-empty">
            <div className="obt-empty-icon"><i className="ti ti-checklist" /></div>
            <h3>{t('checklist.empty')}</h3>
            <p>{t('checklist.emptyText')}</p>
            <button className="obt-btn obt-btn--primary" onClick={openNew}>{t('checklist.new')}</button>
          </div>
        ) : (
          lists.map(c => {
            const p = progress[c.id] || { done: 0, total: 0 }
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
            const complete = p.total > 0 && p.done === p.total
            return (
              <div key={c.id} className="obt-panel">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{ margin: 0 }}>
                    <Link to={`/journal/checklist/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {c.title}
                    </Link>
                  </h3>
                  {c.visibility !== 'private' && (
                    <span title={t('visibility.unlisted')} style={{ fontSize: 12 }}><i className="ti ti-link" /></span>
                  )}
                  <span className="obt-text-soft" style={{ fontSize: 12 }}>{formatDate(c.created_at)}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: complete ? 'var(--primary)' : 'var(--ink-soft)' }}>
                    {p.done}/{p.total}
                    {complete && <> · <i className="ti ti-circle-check" /></>}
                  </span>
                </div>

                {c.description && (
                  <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 10px', color: 'var(--ink-soft)' }}>
                    {c.description}
                  </p>
                )}

                {/* barra di progresso */}
                <div style={{ height: 6, borderRadius: 999, background: 'var(--card)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: 'var(--primary)', borderRadius: 999, transition: 'width .2s',
                  }} />
                </div>

                <Link to={`/journal/checklist/${c.id}`} style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                  {t('checklist.open')} →
                </Link>
              </div>
            )
          })
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('checklist.newTitle')} size="md">
        <div className="obt-field">
          <label>{t('checklist.name')} *</label>
          <input className="obt-input" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder={t('checklist.namePlaceholder')} />
        </div>
        <div className="obt-field">
          <label>{t('checklist.description')} <span className="obt-optional">{t('common.optional')}</span></label>
          <textarea className="obt-textarea" rows={3} value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder={t('checklist.descriptionPlaceholder')} />
          <div className="obt-hint">{t('checklist.descriptionHint')}</div>
        </div>
        <div className="obt-field">
          <label>{t('visibility.label')}</label>
          <VisibilityToggle
            value={form.visibility}
            onChange={v => setForm({ ...form, visibility: v })}
            variant="full"
          />
        </div>
        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={save} disabled={!form.title.trim()}>
            {t('common.create')}
          </button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
        </div>
      </Modal>
    </>
  )
}
