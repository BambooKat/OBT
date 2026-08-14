// src/pages/vivarex/VivarexProjects.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useT } from '../../i18n'
import Modal from '../Modal'
import { IconPencil, IconTrash } from '@tabler/icons-react'

function ProjectForm({ initial, onSave, onClose }) {
  const { t } = useT()
  const [name, setName]             = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [originalCreator, setOriginalCreator] = useState(initial?.original_creator ?? '')
  const [coverUrl, setCoverUrl]     = useState(initial?.cover_url ?? '')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError(t('vivarex.projectName') + ' ' + t('common.optional').replace('(','').replace(')','') + ' required'); return }
    setError(null); setSaving(true)
    await onSave({ name: name.trim(), description: description.trim() || null, original_creator: originalCreator.trim() || null, cover_url: coverUrl.trim() || null })
    setSaving(false)
  }

  return (
    <div>
      {error && <div className="obt-alert obt-alert--error" style={{ marginBottom: 14 }}>{error}</div>}
      <div className="obt-field">
        <label>{t('vivarex.projectName')} *</label>
        <input className="obt-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('vivarex.projectNamePlaceholder')} />
      </div>
      <div className="obt-field">
        <label>{t('checklist.description')} <span className="obt-optional">{t('common.optional')}</span></label>
        <textarea className="obt-textarea" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="obt-field">
        <label>{t('vivarex.creator')} <span className="obt-optional">{t('common.optional')}</span></label>
        <input className="obt-input" value={originalCreator} onChange={e => setOriginalCreator(e.target.value)} placeholder={t('vivarex.creatorPlaceholder')} />
      </div>
      <div className="obt-field">
        <label>{t('vivarex.coverUrl')} <span className="obt-optional">{t('common.optional')}</span></label>
        <input className="obt-input" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
        {coverUrl && (
          <img src={coverUrl} alt="preview"
            style={{ marginTop: 8, borderRadius: 8, maxHeight: 100, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
        )}
      </div>
      <div className="obt-actions">
        <button className="obt-btn obt-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="obt-btn obt-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? t('common.loading') : initial ? t('common.save') : t('vivarex.newProject') + ' →'}
        </button>
      </div>
    </div>
  )
}

function DeleteConfirm({ project, onConfirm, onClose }) {
  const { t } = useT()
  const [deleting, setDeleting] = useState(false)
  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        {t('vivarex.deleteProjectConfirm', { name: project.name })}
      </p>
      <div className="obt-actions">
        <button className="obt-btn obt-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="obt-btn obt-btn--danger" disabled={deleting}
          onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false) }}>
          {deleting ? t('common.loading') : t('common.delete')}
        </button>
      </div>
    </div>
  )
}

export default function VivarexProjects() {
  const { t } = useT()
  const navigate = useNavigate()
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [createOpen, setCreateOpen]     = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('vivarex_projects')
      .select('*, vivarex_pets(id, owned_male, owned_female, owned, target)')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setProjects(data ?? [])
    setLoading(false)
  }

  function calcProgress(pets) {
    if (!pets?.length) return { owned: 0, total: 0, pct: 0 }
    const total = pets.length
    const owned = pets.filter(p => p.target === 'couple' ? p.owned_male && p.owned_female : p.owned).length
    return { owned, total, pct: Math.round((owned / total) * 100) }
  }

  async function handleCreate(fields) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('vivarex_projects').insert({ ...fields, user_id: user.id }).select().single()
    setProjects(prev => [...prev, { ...data, vivarex_pets: [] }])
    setCreateOpen(false)
    navigate(`/vivarex/${data.id}`)
  }

  async function handleEdit(fields) {
    const { data } = await supabase.from('vivarex_projects').update(fields).eq('id', editTarget.id).select().single()
    setProjects(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p))
    setEditTarget(null)
  }

  async function handleDelete() {
    await supabase.from('vivarex_projects').delete().eq('id', deleteTarget.id)
    setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  const totalPets = projects.reduce((acc, p) => acc + (p.vivarex_pets?.length ?? 0), 0)

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={() => setCreateOpen(true)}>
              <i className="ti ti-plus" /> {t('vivarex.newProject')}
            </button>
          </div>
          <div className="obt-hero-title">
            <h1>{t('vivarex.title')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">{t('vivarex.subtitle')}</p>
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('vivarex.projects')}</span> {projects.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('vivarex.totalPets')}</span> {totalPets}
            </div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        {projects.length === 0 ? (
          <div className="obt-empty">
            <div className="obt-empty-icon">🐾</div>
            <h3>{t('vivarex.noProjects')}</h3>
            <p>{t('vivarex.noProjectsHint')}</p>
            <button className="obt-btn obt-btn--primary" onClick={() => setCreateOpen(true)}>
              <i className="ti ti-plus" /> {t('vivarex.newProject')}
            </button>
          </div>
        ) : (
          <div className="obt-grid">
            {projects.map(p => {
              const { owned, total, pct } = calcProgress(p.vivarex_pets)
              return (
                <div key={p.id} className="obt-card" onClick={() => navigate(`/vivarex/${p.id}`)}>
                  <div className="obt-badge">{pct}%</div>
                  {p.cover_url && (
                    <img src={p.cover_url} alt={p.name}
                      style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <h3>{p.name}</h3>
                  {p.original_creator && (
                    <div className="obt-meta" style={{ marginBottom: 4 }}>
                      <i className="ti ti-user" /> {p.original_creator}
                    </div>
                  )}
                  {p.description && <p className="obt-card-preview">{p.description}</p>}
                  <div className="obt-stats">
                    <div><b>{owned}</b> / {total} {t('vivarex.completed').toLowerCase()}</div>
                  </div>
                  <div className="obt-card-progress" style={{ marginTop: 10 }}>
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  <div className="obt-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="obt-icon-btn" title={t('vivarex.editProject')} onClick={() => setEditTarget(p)}>
                      <IconPencil size={15} />
                    </button>
                    <button className="obt-icon-btn obt-icon-btn--danger" title={t('vivarex.deleteProject')} onClick={() => setDeleteTarget(p)}>
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('vivarex.newProject')} size="sm">
        <ProjectForm onSave={handleCreate} onClose={() => setCreateOpen(false)} />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('vivarex.editProject')} size="sm">
        {editTarget && <ProjectForm initial={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />}
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('vivarex.deleteProject')} size="sm">
        {deleteTarget && <DeleteConfirm project={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      </Modal>
    </>
  )
}