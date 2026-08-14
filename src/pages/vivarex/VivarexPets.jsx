// src/pages/vivarex/VivarexPets.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useT } from '../../i18n'
import Modal from '../Modal'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function ProjectForm({ initial, onSave, onClose }) {
  const { t } = useT()
  const [name, setName]                       = useState(initial?.name ?? '')
  const [description, setDescription]         = useState(initial?.description ?? '')
  const [originalCreator, setOriginalCreator] = useState(initial?.original_creator ?? '')
  const [coverUrl, setCoverUrl]               = useState(initial?.cover_url ?? '')
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError(t('vivarex.projectName') + ' required'); return }
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
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

function Lightbox({ src, alt, onClose }) {
  return (
    <div className="obt-modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <img src={src} alt={alt}
        style={{ width: '40vw', height: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()} />
    </div>
  )
}

function PetForm({ initial, onSave, onClose }) {
  const { t } = useT()
  const [name, setName]         = useState(initial?.name ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
  const [target, setTarget]     = useState(initial?.target ?? 'couple')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError(t('vivarex.petName') + ' required'); return }
    setError(null); setSaving(true)
    await onSave({ name: name.trim(), image_url: imageUrl.trim() || null, target })
    setSaving(false)
  }

  return (
    <div>
      {error && <div className="obt-alert obt-alert--error" style={{ marginBottom: 14 }}>{error}</div>}
      <div className="obt-field">
        <label>{t('vivarex.petName')} *</label>
        <input className="obt-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('vivarex.petNamePlaceholder')} />
      </div>
      <div className="obt-field">
        <label>{t('vivarex.imageUrl')} <span className="obt-optional">{t('common.optional')}</span></label>
        <input className="obt-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
        {imageUrl && (
          <img src={imageUrl} alt="preview"
            style={{ marginTop: 8, width: 80, height: 80, objectFit: 'contain', borderRadius: 8, background: 'var(--bg)' }}
            onError={e => { e.target.style.display = 'none' }} />
        )}
      </div>
      <div className="obt-field">
        <label>{t('vivarex.type')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['couple', t('vivarex.typeCouple')], ['single', t('vivarex.typeSingle')]].map(([val, label]) => (
            <button key={val}
              className={`obt-btn obt-btn--ghost obt-btn--sm${target === val ? ' is-active' : ''}`}
              onClick={() => setTarget(val)}
            >{label}</button>
          ))}
        </div>
      </div>
      <div className="obt-actions">
        <button className="obt-btn obt-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="obt-btn obt-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? t('common.loading') : initial ? t('common.save') : t('vivarex.addPet')}
        </button>
      </div>
    </div>
  )
}

function DeleteConfirm({ pet, onConfirm, onClose }) {
  const { t } = useT()
  const [deleting, setDeleting] = useState(false)
  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        {t('vivarex.deletePetConfirm', { name: pet.name })}
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

function PetCard({ pet, onStatusChange, onEdit, onDelete }) {
  const [lightbox, setLightbox] = useState(false)

  async function toggleMale() {
    const val = !pet.owned_male
    await supabase.from('vivarex_pets').update({ owned_male: val }).eq('id', pet.id)
    onStatusChange(pet.id, { owned_male: val })
  }
  async function toggleFemale() {
    const val = !pet.owned_female
    await supabase.from('vivarex_pets').update({ owned_female: val }).eq('id', pet.id)
    onStatusChange(pet.id, { owned_female: val })
  }
  async function toggleOwned() {
    const val = !pet.owned
    await supabase.from('vivarex_pets').update({ owned: val }).eq('id', pet.id)
    onStatusChange(pet.id, { owned: val })
  }

  const isComplete = pet.target === 'couple' ? pet.owned_male && pet.owned_female : pet.owned

  return (
    <>
      <div className="vx-pet-card" style={isComplete ? { borderColor: 'var(--primary)', borderWidth: 2 } : {}}>
        <div className="vx-pet-img-wrap"
          onClick={() => pet.image_url && setLightbox(true)}
          style={{ cursor: pet.image_url ? 'zoom-in' : 'default' }}
        >
          {pet.image_url
            ? <img className="vx-pet-img" src={pet.image_url} alt={pet.name} />
            : <div className="vx-pet-img-placeholder">🐾</div>
          }
          <div className="vx-pet-name-bar">{pet.name}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
          {/* Bottoni stato */}
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {pet.target === 'couple' ? (
              <>
                <button
                  onClick={toggleMale}
                  style={{
                    flex: 1, padding: '5px 4px', borderRadius: 8, border: '2px solid',
                    fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: pet.owned_male ? 'var(--primary)' : 'var(--line)',
                    background: pet.owned_male ? 'var(--primary)' : 'var(--card)',
                    color: pet.owned_male ? '#fff' : 'var(--ink-soft)',
                    transition: 'all .12s ease',
                  }}
                >♂</button>
                <button
                  onClick={toggleFemale}
                  style={{
                    flex: 1, padding: '5px 4px', borderRadius: 8, border: '2px solid',
                    fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: pet.owned_female ? 'var(--secondary)' : 'var(--line)',
                    background: pet.owned_female ? 'var(--secondary)' : 'var(--card)',
                    color: pet.owned_female ? '#fff' : 'var(--ink-soft)',
                    transition: 'all .12s ease',
                  }}
                >♀</button>
              </>
            ) : (
              <button
                onClick={toggleOwned}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 8, border: '2px solid',
                  fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  borderColor: pet.owned ? 'var(--primary)' : 'var(--line)',
                  background: pet.owned ? 'var(--primary)' : 'var(--card)',
                  color: pet.owned ? '#fff' : 'var(--ink-soft)',
                  transition: 'all .12s ease',
                }}
              >✓</button>
            )}
          </div>
          {/* Azioni */}
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button className="obt-icon-btn" onClick={onEdit}><IconPencil size={13} /></button>
            <button className="obt-icon-btn obt-icon-btn--danger" onClick={onDelete}><IconTrash size={13} /></button>
          </div>
        </div>
      </div>
      {lightbox && <Lightbox src={pet.image_url} alt={pet.name} onClose={() => setLightbox(false)} />}
    </>
  )
}

function SortablePetCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.pet.id })
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}
      {...attributes} {...listeners}
    >
      <PetCard {...props} />
    </div>
  )
}

export default function VivarexPets() {
  const { t } = useT()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject]           = useState(null)
  const [pets, setPets]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [addOpen, setAddOpen]               = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [editTarget, setEditTarget]         = useState(null)
  const [deleteTarget, setDeleteTarget]     = useState(null)
  const [sortMode, setSortMode]         = useState('date')
  const [sortDir, setSortDir]           = useState('desc')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { load() }, [projectId])

  async function load() {
    setLoading(true)
    const [projRes, petsRes] = await Promise.all([
      supabase.from('vivarex_projects').select('*').eq('id', projectId).single(),
      supabase.from('vivarex_pets').select('*').eq('project_id', projectId)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    ])
    setProject(projRes.data)
    setPets(petsRes.data ?? [])
    setLoading(false)
  }

  function handleSortBtn(key) {
    if (key === 'drag') { setSortMode('drag'); return }
    if (sortMode === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortMode(key); setSortDir(key === 'date' ? 'desc' : 'asc') }
  }

  const displayed = (() => {
    if (sortMode === 'drag') return pets
    const sorted = [...pets].sort((a, b) =>
      sortMode === 'alpha' ? a.name.localeCompare(b.name) : new Date(a.created_at) - new Date(b.created_at)
    )
    return sortDir === 'desc' ? sorted.reverse() : sorted
  })()

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const reordered = arrayMove(pets, pets.findIndex(p => p.id === active.id), pets.findIndex(p => p.id === over.id))
    setPets(reordered)
    await Promise.all(reordered.map((p, i) => supabase.from('vivarex_pets').update({ sort_order: i }).eq('id', p.id)))
  }

  function handleStatusChange(petId, updates) {
    setPets(prev => prev.map(p => p.id === petId ? { ...p, ...updates } : p))
  }

  async function handleEditProject(fields) {
    const { data } = await supabase.from('vivarex_projects').update(fields).eq('id', projectId).select().single()
    setProject(data)
    setEditProjectOpen(false)
  }

  async function handleAdd(fields) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('vivarex_pets')
      .insert({ ...fields, project_id: projectId, user_id: user.id }).select().single()
    setPets(prev => [...prev, data])
    setAddOpen(false)
  }

  async function handleEdit(fields) {
    const { data } = await supabase.from('vivarex_pets').update(fields).eq('id', editTarget.id).select().single()
    setPets(prev => prev.map(p => p.id === data.id ? data : p))
    setEditTarget(null)
  }

  async function handleDelete() {
    await supabase.from('vivarex_pets').delete().eq('id', deleteTarget.id)
    setPets(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const owned = pets.filter(p => p.target === 'couple' ? p.owned_male && p.owned_female : p.owned).length
  const pct   = pets.length ? Math.round((owned / pets.length) * 100) : 0

  const sortBtns = [
    { key: 'alpha', icon: 'ti-sort-a-z',    title: t('vivarex.sortAlpha'),  dir: true },
    { key: 'date',  icon: 'ti-clock',        title: t('vivarex.sortDate'),   dir: true },
    { key: 'drag',  icon: 'ti-arrows-sort',  title: t('vivarex.sortManual'), dir: false },
  ]

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (!project) return <div className="obt-loading">Progetto non trovato.</div>

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/vivarex')}>
              <i className="ti ti-arrow-left" /> {t('vivarex.allProjects')}
            </button>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setEditProjectOpen(true)} style={{ marginTop: 8 }}>
              <i className="ti ti-pencil" /> {t('vivarex.editProject')}
            </button>
          </div>
          <div className="obt-hero-title">
            <h1>{project.name}</h1>
            {project.original_creator && (
              <p className="obt-hero-desc" style={{ color: 'var(--primary-dark)' }}>by {project.original_creator}</p>
            )}
            {project.description && <p className="obt-hero-desc obt-hero-desc--empty">{project.description}</p>}
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('vivarex.totalPets')}</span> {pets.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('vivarex.completed')}</span> {owned}/{pets.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('vivarex.progress')}</span> {pct}%
            </div>

          </div>
        </div>
      </div>

      <div className="obt-page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div className="obt-sortseg">
            {sortBtns.map(b => {
              const isActive = sortMode === b.key
              const arrow = b.dir && isActive ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
              return (
                <button key={b.key} type="button"
                  className={isActive ? 'is-active' : ''}
                  onClick={() => handleSortBtn(b.key)}
                  title={b.title + arrow}
                >
                  <i className={`ti ${b.icon}`} />
                </button>
              )
            })}
          </div>
          <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={() => setAddOpen(true)}>
            <i className="ti ti-plus" /> {t('vivarex.addPet')}
          </button>
        </div>
        {sortMode === 'drag' && pets.length > 1 && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            {t('vivarex.sortManualHint')}
          </p>
        )}
        {pets.length === 0 ? (
          <div className="obt-empty">
            <div className="obt-empty-icon">🐾</div>
            <h3>{t('vivarex.noPets')}</h3>
            <p>{t('vivarex.noPetsHint')}</p>
            <button className="obt-btn obt-btn--primary" onClick={() => setAddOpen(true)}>
              <i className="ti ti-plus" /> {t('vivarex.addPet')}
            </button>
          </div>
        ) : sortMode === 'drag' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pets.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="vx-pets-grid">
                {pets.map(pet => (
                  <SortablePetCard key={pet.id} pet={pet}
                    onStatusChange={handleStatusChange}
                    onEdit={() => setEditTarget(pet)}
                    onDelete={() => setDeleteTarget(pet)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="vx-pets-grid">
            {displayed.map(pet => (
              <PetCard key={pet.id} pet={pet}
                onStatusChange={handleStatusChange}
                onEdit={() => setEditTarget(pet)}
                onDelete={() => setDeleteTarget(pet)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={editProjectOpen} onClose={() => setEditProjectOpen(false)} title={t('vivarex.editProject')} size="sm">
        {project && <ProjectForm initial={project} onSave={handleEditProject} onClose={() => setEditProjectOpen(false)} />}
      </Modal>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('vivarex.addPet')} size="sm">
        <PetForm onSave={handleAdd} onClose={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('vivarex.editPet')} size="sm">
        {editTarget && <PetForm initial={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />}
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('vivarex.deletePet')} size="sm">
        {deleteTarget && <DeleteConfirm pet={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      </Modal>
    </>
  )
}
