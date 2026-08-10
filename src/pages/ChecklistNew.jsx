// src/pages/ChecklistNew.jsx
// Step iniziale di creazione: un modal chiede titolo/descrizione/tag/visibilità;
// a "Crea" la checklist nasce con quei dati e si apre l'EDITOR (modifica), dove
// si inseriscono gruppi e voci. Niente bozza vuota: la checklist esiste solo se
// confermi. "Annulla" torna al diario.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import Modal from './Modal'
import VisibilityToggle from './VisibilityToggle'

const parseTags = (raw) =>
  (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default function ChecklistNew() {
  const { t } = useT()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', tags: '', visibility: 'private' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cancel = () => navigate('/journal')

  const create = async () => {
    if (!form.title.trim()) return
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('journal_checklists').insert({
      owner_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      tags: parseTags(form.tags),
      visibility: form.visibility,
    }).select('id').single()
    if (error) { setError(t('checklist.saveError')); setSaving(false); return }
    navigate(`/journal/checklist/${data.id}/edit`, { replace: true })
  }

  return (
    <Modal open={true} onClose={cancel} title={t('checklist.newTitle')} size="md">
      {error && <div className="obt-alert obt-alert--error">{error}</div>}
      <div className="obt-field">
        <label>{t('checklist.name')} *</label>
        <input className="obt-input" value={form.title} autoFocus
          onChange={e => setForm({ ...form, title: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter' && form.title.trim()) create() }}
          placeholder={t('checklist.namePlaceholder')} />
      </div>
      <div className="obt-field">
        <label>{t('checklist.description')} <span className="obt-optional">{t('common.optional')}</span></label>
        <textarea className="obt-textarea" rows={3} value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder={t('checklist.descriptionPlaceholder')} />
      </div>
      <div className="obt-field">
        <label>{t('journal.tags')} <span className="obt-optional">{t('common.optional')}</span></label>
        <input className="obt-input" value={form.tags}
          onChange={e => setForm({ ...form, tags: e.target.value })}
          placeholder={t('journal.tagsPlaceholder')} />
      </div>
      <div className="obt-field">
        <label>{t('visibility.label')}</label>
        <VisibilityToggle value={form.visibility}
          onChange={v => setForm({ ...form, visibility: v })} variant="full" />
      </div>
      <div className="obt-actions">
        <button className="obt-btn obt-btn--primary" onClick={create} disabled={!form.title.trim() || saving}>
          {saving ? t('common.loading') : t('common.create')}
        </button>
        <button className="obt-btn obt-btn--ghost" onClick={cancel}>{t('common.cancel')}</button>
      </div>
    </Modal>
  )
}
