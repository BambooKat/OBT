import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import { useT } from '../i18n'

// Modale condivisa per creare una LINEA.
// projectId = null  -> linea sciolta (Dashboard principale)
// projectId = <id>  -> linea dentro quel contenitore (Dashboard del progetto)
export default function NewLineModal({ open, onClose, onCreated, species, defaultAuthor, projectId = null }) {
  const { t } = useT()
  const [form, setForm] = useState({ name: '', species_id: '', author: '', collaborators: '', project_notes: '' })

  useEffect(() => {
    if (open) {
      setForm({ name: '', species_id: species[0]?.id || '', author: defaultAuthor || '', collaborators: '', project_notes: '' })
    }
  }, [open, species, defaultAuthor])

  const submit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('lines').insert({
      owner_id: user.id,
      name: form.name,
      species_id: form.species_id,
      author: form.author || null,
      collaborators: form.collaborators || null,
      project_notes: form.project_notes || null,
      project_id: projectId,
    }).select('*, species(name)').single()
    if (!error && data) { onCreated(data); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('dashboard.newLineTitle')}>
      <form onSubmit={submit}>
        <div className="obt-hint">{t('dashboard.lineHint')}</div>
        <div className="obt-row">
          <div className="obt-field"><label>{t('dashboard.name')} *</label><input className="obt-input" type="text" placeholder={t('dashboard.namePlaceholder')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="obt-field"><label>{t('dashboard.species')} *</label><select className="obt-select" value={form.species_id} onChange={e => setForm({ ...form, species_id: e.target.value })} required>{species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        </div>
        <div className="obt-row">
          <div className="obt-field"><label>{t('dashboard.author')} *</label><input className="obt-input" type="text" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} required /></div>
          <div className="obt-field"><label>{t('dashboard.collaborators')} <span className="obt-optional">{t('common.optional')}</span></label><input className="obt-input" type="text" value={form.collaborators} onChange={e => setForm({ ...form, collaborators: e.target.value })} /></div>
        </div>
        <div className="obt-field"><label>{t('dashboard.notes')} <span className="obt-optional">{t('common.optional')}</span></label><textarea className="obt-textarea" value={form.project_notes} onChange={e => setForm({ ...form, project_notes: e.target.value })} /></div>
        <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">{t('dashboard.createLine')}</button><button type="button" className="obt-btn obt-btn--ghost" onClick={onClose}>{t('common.cancel')}</button></div>
      </form>
    </Modal>
  )
}
