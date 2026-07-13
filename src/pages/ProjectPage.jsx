import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MutationSelector from './MutationSelector'
import Modal from './Modal'
import { useT } from '../i18n'

const ColorCell = ({ hex }) => {
  if (!hex) return <span style={{ color: 'var(--ink-soft)' }}>-</span>
  const clean = hex.startsWith('#') ? hex : `#${hex}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: 16, height: 16, borderRadius: 4,
        background: clean, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0,
      }} />
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{clean.toUpperCase()}</span>
    </span>
  )
}

const petLabel = (pet) => pet?.letter ? `${pet.letter} — ${pet.code}` : (pet?.code || '?')

// ---- Mini-form griglia ----
function PairCellModal({ open, onClose, pair, female, male, round, onSave, onDelete, isOwner }) {
  const { t } = useT()
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [childCode, setChildCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(pair?.pair_date || '')
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <label>🥚 {t('project.pairs.addChildCode')}</label>
          <input className="obt-input" value={childCode} onChange={e => setChildCode(e.target.value)} placeholder={t('project.pairs.childCodePlaceholder')} />
          <p className="obt-hint" style={{ marginTop: 4 }}>{t('project.pairs.childHint')}</p>
        </div>
        <div className="obt-actions" style={{ marginTop: 4 }}>
          {isOwner && (
            <button className="obt-btn obt-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : (pair ? t('common.saveChanges') : t('project.pairs.submit'))}
            </button>
          )}
          {isOwner && pair && (
            <button className="obt-btn obt-btn--danger obt-btn--sm" onClick={handleDelete} disabled={saving}>
              {t('common.delete')}
            </button>
          )}
          <button className="obt-btn obt-btn--ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
        </div>
      </div>
    </Modal>
  )
}

// ---- Componente griglia ----
function PairGrid({ round, females, males, pairsInRound, onCellClick, isOwner }) {
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
      <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 300 }}>
        <thead>
          <tr>
            <th style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 700,
              color: 'var(--muted)', textAlign: 'left', background: 'transparent',
            }}>♀ \ ♂</th>
            {males.map(m => (
              <th key={m.id} style={{
                padding: '6px 10px', fontSize: 12, fontWeight: 700,
                color: 'var(--ink)', textAlign: 'center', background: 'transparent',
                whiteSpace: 'nowrap',
              }}>
                {m.letter && <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{m.letter}</span>}
                {m.letter && ' '}
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.code}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {females.map(f => (
            <tr key={f.id}>
              <td style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', color: 'var(--ink)',
              }}>
                {f.letter && <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{f.letter}</span>}
                {f.letter && ' '}
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.code}</span>
              </td>
              {males.map(m => {
                const pair = cellMap[`${f.id}:${m.id}`]
                const done = !!pair
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
                        width: 52, height: 36,
                        borderRadius: 8,
                        border: done ? '2px solid var(--primary)' : '2px dashed var(--line)',
                        background: done ? 'var(--primary)' : 'var(--surface)',
                        color: done ? '#fff' : 'var(--muted)',
                        cursor: isOwner ? 'pointer' : (done ? 'default' : 'not-allowed'),
                        fontSize: done ? 16 : 20,
                        fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                        flexShrink: 0,
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
    </div>
  )
}

function ProjectPage() {
  const { t, formatDate } = useT()
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [pets, setPets] = useState([])
  const [pairs, setPairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('starters')
  const [isOwner, setIsOwner] = useState(false)
  const [actionError, setActionError] = useState('')

  // Form pet
  const [showPetForm, setShowPetForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState(null)
  const [petForm, setPetForm] = useState({
    code: '', sex: 'M', letter: '', generation: 0,
    mother_id: '', father_id: '',
    eyes: '', body1: '', body2: '', extra1: '', extra2: '', notes: ''
  })
  const [selectedMutationIds, setSelectedMutationIds] = useState([])
  const [petMutationCounts, setPetMutationCounts] = useState({})

  // Target
  const [targetForm, setTargetForm] = useState({
    target_eyes: '', target_body1: '', target_body2: '', target_extra1: '', target_extra2: ''
  })
  const [targetMutationIds, setTargetMutationIds] = useState([])

  // Griglia: stato cella aperta
  const [cellModal, setCellModal] = useState({
    open: false, female: null, male: null, pair: null, round: 1
  })

  // Selezione round attivo nella tab Coppie
  const [activeRound, setActiveRound] = useState(1)

  // Edit progetto
  const [showEditProject, setShowEditProject] = useState(false)
  const [speciesList, setSpeciesList] = useState([])
  const [editProjectForm, setEditProjectForm] = useState({
    name: '', species_id: '', author: '', collaborators: '', project_notes: '', is_public: false
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadAll() }, [id])
  useEffect(() => { setShowPetForm(false) }, [activeTab])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: projectData } = await supabase.from('projects').select('*, species(name)').eq('id', id).single()
    if (!projectData) { navigate('/dashboard'); return }

    setProject(projectData)
    setIsOwner(user && user.id === projectData.owner_id)
    setEditProjectForm({
      name: projectData.name || '',
      species_id: projectData.species_id || '',
      author: projectData.author || '',
      collaborators: projectData.collaborators || '',
      project_notes: projectData.project_notes || '',
      is_public: projectData.is_public === true,
    })
    setTargetForm({
      target_eyes: projectData.target_eyes || '',
      target_body1: projectData.target_body1 || '',
      target_body2: projectData.target_body2 || '',
      target_extra1: projectData.target_extra1 || '',
      target_extra2: projectData.target_extra2 || '',
    })

    const { data: speciesData } = await supabase.from('species').select('*').order('name', { ascending: true })
    setSpeciesList(speciesData || [])

    const { data: petsData } = await supabase.from('pets').select('*').eq('project_id', id).order('code', { ascending: true })
    setPets(petsData || [])

    if (petsData && petsData.length > 0) {
      const petIds = petsData.map(p => p.id)
      const { data: petMutsData } = await supabase.from('pet_mutations').select('pet_id').in('pet_id', petIds)
      const counts = {}
      ;(petMutsData || []).forEach(pm => { counts[pm.pet_id] = (counts[pm.pet_id] || 0) + 1 })
      setPetMutationCounts(counts)
    } else {
      setPetMutationCounts({})
    }

    const { data: pairsData } = await supabase
      .from('pairs')
      .select('*, mother:mother_id(id, code, letter), father:father_id(id, code, letter)')
      .eq('project_id', id)
      .order('round_number', { ascending: true })
      .order('created_at', { ascending: false })
    setPairs(pairsData || [])

    const { data: projMuts } = await supabase.from('project_mutations').select('mutation_id').eq('project_id', id)
    setTargetMutationIds((projMuts || []).map(pm => pm.mutation_id))

    setLoading(false)
  }, [id, navigate])

  const hexToRgb = (hex) => {
    if (!hex) return null
    const h = hex.replace('#', '')
    if (h.length !== 6) return null
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }

  const colorDist = (h1, h2) => {
    const a = hexToRgb(h1), b = hexToRgb(h2)
    if (!a || !b) return null
    return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)
  }

  const totalDist = (pet) => {
    if (!project) return null
    const pairsList = [
      [pet.eyes, project.target_eyes], [pet.body1, project.target_body1],
      [pet.body2, project.target_body2], [pet.extra1, project.target_extra1],
      [pet.extra2, project.target_extra2],
    ]
    let total = 0, count = 0
    for (const [a, b] of pairsList) {
      const d = colorDist(a, b)
      if (d !== null) { total += d; count++ }
    }
    return count > 0 ? total : null
  }

  const distClass = (d) => {
    if (d === null) return ''
    if (d < 60) return 'obt-dist-pill--good'
    if (d < 130) return 'obt-dist-pill--mid'
    return 'obt-dist-pill--bad'
  }

  const fail = (error, msg) => {
    if (!error) return false
    console.error(msg, error)
    setActionError(`${msg}: ${error.message}`)
    return true
  }

  const resetPetForm = () => {
    setPetForm({ code: '', sex: 'M', letter: '', generation: 0, mother_id: '', father_id: '', eyes: '', body1: '', body2: '', extra1: '', extra2: '', notes: '' })
    setSelectedMutationIds([])
    setEditingPetId(null)
    setShowPetForm(false)
  }

  const openNewPetForm = (prefill = {}) => {
    resetPetForm()
    setPetForm(prev => ({ ...prev, generation: activeTab === 'children' ? 1 : 0, ...prefill }))
    setShowPetForm(true)
  }

  const handlePetSubmit = async (e) => {
    e.preventDefault()
    setActionError('')
    const payload = {
      project_id: id, code: petForm.code, sex: petForm.sex,
      letter: petForm.letter || null, generation: parseInt(petForm.generation) || 0,
      mother_id: petForm.mother_id || null, father_id: petForm.father_id || null,
      eyes: petForm.eyes || null, body1: petForm.body1 || null, body2: petForm.body2 || null,
      extra1: petForm.extra1 || null, extra2: petForm.extra2 || null, notes: petForm.notes || null,
    }
    let petId = editingPetId
    if (editingPetId) {
      const { error } = await supabase.from('pets').update(payload).eq('id', editingPetId)
      if (fail(error, t('project.errors.savePet'))) return
      const { error: delErr } = await supabase.from('pet_mutations').delete().eq('pet_id', editingPetId)
      if (fail(delErr, t('project.errors.updateMutations'))) return
    } else {
      const { data: newPet, error } = await supabase.from('pets').insert(payload).select().single()
      if (fail(error, t('project.errors.addPet'))) return
      petId = newPet?.id
    }
    if (petId && selectedMutationIds.length > 0) {
      const rows = selectedMutationIds.map(mutationId => ({ pet_id: petId, mutation_id: mutationId }))
      const { error } = await supabase.from('pet_mutations').insert(rows)
      if (fail(error, t('project.errors.saveMutations'))) return
    }
    resetPetForm()
    if (!editingPetId && parseInt(payload.generation) > 0) setActiveTab('children')
    loadAll()
  }

  const handleEditPet = async (pet) => {
    setPetForm({
      code: pet.code, sex: pet.sex, letter: pet.letter || '', generation: pet.generation,
      mother_id: pet.mother_id || '', father_id: pet.father_id || '',
      eyes: pet.eyes || '', body1: pet.body1 || '', body2: pet.body2 || '',
      extra1: pet.extra1 || '', extra2: pet.extra2 || '', notes: pet.notes || ''
    })
    const { data: petMuts } = await supabase.from('pet_mutations').select('mutation_id').eq('pet_id', pet.id)
    setSelectedMutationIds((petMuts || []).map(pm => pm.mutation_id))
    setEditingPetId(pet.id)
    setShowPetForm(true)
  }

  const handleDeletePet = async (petId) => {
    const pet = pets.find(p => p.id === petId)
    if (!window.confirm(t('project.confirm.deletePet', { code: pet?.code || '' }))) return
    setActionError('')
    const { error } = await supabase.from('pets').delete().eq('id', petId)
    if (fail(error, t('project.errors.deletePet'))) return
    loadAll()
  }

  const handleTargetSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setActionError('')
    const { error } = await supabase.from('projects').update(targetForm).eq('id', id)
    if (fail(error, t('project.errors.saveTargetColours'))) return
    const { error: delErr } = await supabase.from('project_mutations').delete().eq('project_id', id)
    if (fail(delErr, t('project.errors.updateTargetMutations'))) return
    if (targetMutationIds.length > 0) {
      const rows = targetMutationIds.map(mutationId => ({ project_id: id, mutation_id: mutationId }))
      const { error: insErr } = await supabase.from('project_mutations').insert(rows)
      if (fail(insErr, t('project.errors.saveTargetMutations'))) return
    }
    loadAll()
  }

  // ---- Gestione cella griglia ----
  const openCellModal = (female, male, pair) => {
    setCellModal({ open: true, female, male, pair: pair || null, round: activeRound })
  }

  const closeCellModal = () => {
    setCellModal({ open: false, female: null, male: null, pair: null, round: activeRound })
  }

  const handleCellSave = async ({ date, notes, childCode }) => {
    setActionError('')
    const { female, male, pair, round } = cellModal

    if (pair) {
      // Aggiorna coppia esistente
      const { error } = await supabase.from('pairs').update({
        pair_date: date || null,
        outcome_notes: notes || null,
      }).eq('id', pair.id)
      if (fail(error, t('project.errors.registerPair'))) return
    } else {
      // Crea nuova coppia
      const { error } = await supabase.from('pairs').insert({
        project_id: id,
        mother_id: female.id,
        father_id: male.id,
        round_number: round,
        pair_date: date || null,
        outcome_notes: notes || null,
      })
      if (fail(error, t('project.errors.registerPair'))) return
    }

    // Se c'è un codice figlio, crea il pet ND
    if (childCode.trim()) {
      const { error } = await supabase.from('pets').insert({
        project_id: id,
        code: childCode.trim(),
        sex: 'ND',
        generation: 1,
        mother_id: female.id,
        father_id: male.id,
      })
      if (fail(error, t('project.errors.addPet'))) return
    }

    closeCellModal()
    loadAll()
  }

  const handleCellDelete = async () => {
    if (!cellModal.pair) return
    if (!window.confirm(t('project.confirm.deletePair'))) return
    setActionError('')
    const { error } = await supabase.from('pairs').delete().eq('id', cellModal.pair.id)
    if (fail(error, t('project.errors.deletePair'))) return
    closeCellModal()
    loadAll()
  }

  const handleEditProjectSubmit = async (e) => {
    e.preventDefault()
    setActionError('')
    const { error } = await supabase.from('projects').update({
      name: editProjectForm.name,
      species_id: editProjectForm.species_id,
      author: editProjectForm.author || null,
      collaborators: editProjectForm.collaborators || null,
      project_notes: editProjectForm.project_notes || null,
      is_public: editProjectForm.is_public,
    }).eq('id', id)
    if (fail(error, t('project.errors.saveProject'))) return
    setShowEditProject(false)
    loadAll()
  }

  const shareUrl = `${window.location.origin}/project/${id}`

  const handleToggleVisibility = async () => {
    const next = !project.is_public
    if (!next && !window.confirm(t('project.confirm.makePrivate'))) return
    setActionError('')
    const { error } = await supabase.from('projects').update({ is_public: next }).eq('id', id)
    if (fail(error, t('project.errors.toggleVisibility'))) return
    loadAll()
  }

  const handleCopyLink = async () => {
    if (!editProjectForm.is_public) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      window.prompt(t('project.share.copyPrompt'), shareUrl)
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteProject = async () => {
    const confirmed = window.confirm(t('project.confirm.deleteProject', { name: project.name }))
    if (!confirmed) return
    setActionError('')
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (fail(error, t('project.errors.deleteProject'))) return
    navigate('/dashboard')
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (!project) return null

  const starters = pets.filter(p => p.generation === 0)
  const children = pets.filter(p => p.generation > 0)
  const males = pets.filter(p => p.sex === 'M')
  const females = pets.filter(p => p.sex === 'F')

  // Calcola i round esistenti
  const existingRounds = [...new Set(pairs.map(p => p.round_number || 1))].sort((a, b) => a - b)
  const maxRound = existingRounds.length > 0 ? Math.max(...existingRounds) : 0
  // Round visibili: quelli esistenti + uno nuovo sempre disponibile
  const visibleRounds = existingRounds.includes(maxRound + 1)
    ? existingRounds
    : [...existingRounds, maxRound + 1]

  const pairsInActiveRound = pairs.filter(p => (p.round_number || 1) === activeRound)

  const PetTable = ({ list, title }) => (
    <div className="obt-panel">
      <h3 style={{ marginBottom: 14 }}>{title}</h3>
      {list.length === 0 ? (
        <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>{t('common.none')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="obt-table">
            <thead>
              <tr>
                <th>{t('project.table.code')}</th><th>{t('project.table.sex')}</th><th>{t('project.table.letter')}</th><th>{t('project.table.gen')}</th>
                <th>{t('project.table.eyes')}</th><th>{t('project.table.body1')}</th><th>{t('project.table.body2')}</th><th>{t('project.table.extra1')}</th><th>{t('project.table.extra2')}</th>
                <th>{t('project.table.mut')}</th><th>{t('project.table.distance')}</th><th>{t('project.table.notes')}</th>{isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {list.map(pet => {
                const d = totalDist(pet)
                return (
                  <tr key={pet.id}>
                    <td><strong>{pet.code}</strong></td>
                    <td>{pet.sex}</td>
                    <td>{pet.letter || '-'}</td>
                    <td>{pet.generation}</td>
                    <td><ColorCell hex={pet.eyes} /></td>
                    <td><ColorCell hex={pet.body1} /></td>
                    <td><ColorCell hex={pet.body2} /></td>
                    <td><ColorCell hex={pet.extra1} /></td>
                    <td><ColorCell hex={pet.extra2} /></td>
                    <td>{petMutationCounts[pet.id] || 0}v</td>
                    <td>{d !== null ? <span className={`obt-dist-pill ${distClass(d)}`}>{Math.round(d)}</span> : '-'}</td>
                    <td>{pet.notes || ''}</td>
                    {isOwner && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="obt-icon-btn" onClick={() => handleEditPet(pet)} title={t('common.edit')}><i className="ti ti-pencil" /></button>
                        <button className="obt-icon-btn obt-icon-btn--danger" onClick={() => handleDeletePet(pet.id)} title={t('common.delete')}><i className="ti ti-trash" /></button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const tabLabels = {
    starters: t('project.tabs.starters'),
    children: t('project.tabs.children'),
    pairs: t('project.tabs.pairs'),
    target: t('project.tabs.target')
  }

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/dashboard')}>&larr; {t('project.back')}</button>
            {isOwner && <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setShowEditProject(true)}>✎ {t('project.edit')}</button>}
            {isOwner && (
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={handleToggleVisibility} title={project.is_public ? t('project.publicTitle') : t('project.privateTitle')}>
                {project.is_public ? `🔓 ${t('project.public')}` : `🔒 ${t('project.private')}`}
              </button>
            )}
            {!isOwner && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: 'var(--radius-pill)', padding: '6px 14px',
                fontSize: 12, fontWeight: 700, color: 'var(--muted)',
              }}>
                <i className="ti ti-eye" /> {t('project.readOnly')}
              </span>
            )}
          </div>
          <div className="obt-hero-title">
            <h1>{project.name}</h1>
            {project.project_notes
              ? <p className="obt-hero-desc">{project.project_notes}</p>
              : isOwner ? <p className="obt-hero-desc obt-hero-desc--empty">{t('project.noInfo')}</p> : null}
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">{t('project.species')}</span> {project.species?.name}</div>
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">{t('project.author')}</span> {project.author || '-'}</div>
            {project.collaborators && <div className="obt-hero-info-row"><span className="obt-hero-info-label">{t('project.collaborators')}</span> {project.collaborators}</div>}
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">{t('project.created')}</span> {formatDate(project.created_at)}</div>
          </div>
        </div>
        <div className="obt-tabs">
          {['starters', 'children', 'pairs', 'target'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`obt-tab${activeTab === tab ? ' obt-tab--active' : ''}`}>{tabLabels[tab]}</button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="obt-alert obt-alert--error" style={{ margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{actionError}</span>
          <button className="obt-icon-btn" onClick={() => setActionError('')} title={t('common.close')}>✕</button>
        </div>
      )}

      {/* Modal edit progetto */}
      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title={t('project.editTitle')}>
        <form onSubmit={handleEditProjectSubmit}>
          <div className="obt-row">
            <div className="obt-field"><label>{t('dashboard.name')} *</label><input className="obt-input" type="text" value={editProjectForm.name} onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })} required autoFocus /></div>
            <div className="obt-field"><label>{t('dashboard.species')} *</label><select className="obt-select" value={editProjectForm.species_id} onChange={(e) => setEditProjectForm({ ...editProjectForm, species_id: e.target.value })} required>{speciesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <div className="obt-row">
            <div className="obt-field"><label>{t('dashboard.author')}</label><input className="obt-input" type="text" value={editProjectForm.author} onChange={(e) => setEditProjectForm({ ...editProjectForm, author: e.target.value })} /></div>
            <div className="obt-field"><label>{t('dashboard.collaborators')} <span className="obt-optional">{t('common.optional')}</span></label><input className="obt-input" type="text" value={editProjectForm.collaborators} onChange={(e) => setEditProjectForm({ ...editProjectForm, collaborators: e.target.value })} /></div>
          </div>
          <div className="obt-field"><label>{t('dashboard.notes')} <span className="obt-optional">{t('common.optional')}</span></label><textarea className="obt-textarea" value={editProjectForm.project_notes} onChange={(e) => setEditProjectForm({ ...editProjectForm, project_notes: e.target.value })} /></div>
          <div className="obt-field" style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={editProjectForm.is_public} onChange={(e) => setEditProjectForm({ ...editProjectForm, is_public: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              {t('project.share.checkbox')}
            </label>
            <p className="obt-hint" style={{ marginTop: 6 }}>{editProjectForm.is_public ? t('project.share.hintPublic') : t('project.share.hintPrivate')}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, opacity: editProjectForm.is_public ? 1 : 0.45 }}>
              <input className="obt-input" value={shareUrl} readOnly disabled={!editProjectForm.is_public} onFocus={(e) => { if (editProjectForm.is_public) e.target.select() }} style={{ fontFamily: 'monospace', fontSize: 12 }} />
              <button type="button" className="obt-btn obt-btn--ghost obt-btn--sm" onClick={handleCopyLink} disabled={!editProjectForm.is_public} style={{ whiteSpace: 'nowrap' }}>
                {copied ? '✓' : t('common.copy')}
              </button>
            </div>
          </div>
          <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">{t('common.saveChanges')}</button><button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowEditProject(false)}>{t('common.cancel')}</button></div>
        </form>
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <p className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{t('project.danger.zone')}</p>
          <button type="button" className="obt-btn obt-btn--danger obt-btn--sm" onClick={handleDeleteProject}>{t('project.danger.deleteProject')}</button>
        </div>
      </Modal>

      {/* Modal cella griglia */}
      <PairCellModal
        open={cellModal.open}
        onClose={closeCellModal}
        pair={cellModal.pair}
        female={cellModal.female}
        male={cellModal.male}
        round={cellModal.round}
        onSave={handleCellSave}
        onDelete={handleCellDelete}
        isOwner={isOwner}
      />

      <div className="obt-page">
        {/* ---- STARTERS / FIGLI ---- */}
        {(activeTab === 'starters' || activeTab === 'children') && (
          <>
            <div className="obt-section-head">
              <div />
              {isOwner && (
                <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={() => openNewPetForm()}>
                  {activeTab === 'starters' ? t('project.pet.addStarter') : t('project.pet.addChild')}
                </button>
              )}
            </div>
            <Modal open={showPetForm} onClose={resetPetForm} title={editingPetId ? t('project.pet.editTitle') : (activeTab === 'starters' ? t('project.pet.newStarter') : t('project.pet.newChild'))} size="lg">
              <form onSubmit={handlePetSubmit}>
                <div className="obt-row">
                  <div className="obt-field"><label>{t('project.pet.code')}</label><input className="obt-input" value={petForm.code} onChange={e => setPetForm({...petForm, code: e.target.value})} required autoFocus /></div>
                  <div className="obt-field"><label>{t('project.pet.sex')}</label><select className="obt-select" value={petForm.sex} onChange={e => setPetForm({...petForm, sex: e.target.value})}><option value="M">M</option><option value="F">F</option><option value="ND">ND</option></select></div>
                  <div className="obt-field"><label>{t('project.pet.letter')}</label><input className="obt-input" maxLength={1} value={petForm.letter} onChange={e => setPetForm({...petForm, letter: e.target.value})} /></div>
                  <div className="obt-field"><label>{t('project.pet.generation')}</label><input type="number" min="0" className="obt-input" value={petForm.generation} onChange={e => setPetForm({...petForm, generation: e.target.value})} /></div>
                </div>
                {petForm.generation > 0 && (
                  <div className="obt-row">
                    <div className="obt-field">
                      <label>{t('project.pet.mother')}</label>
                      <select className="obt-select" value={petForm.mother_id} onChange={e => setPetForm({...petForm, mother_id: e.target.value})}>
                        <option value="">{t('project.pet.noMother')}</option>
                        {females.map(f => <option key={f.id} value={f.id}>{petLabel(f)}</option>)}
                      </select>
                    </div>
                    <div className="obt-field">
                      <label>{t('project.pet.father')}</label>
                      <select className="obt-select" value={petForm.father_id} onChange={e => setPetForm({...petForm, father_id: e.target.value})}>
                        <option value="">{t('project.pet.noFather')}</option>
                        {males.map(m => <option key={m.id} value={m.id}>{petLabel(m)}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="obt-row">
                  <div className="obt-field"><label>{t('project.pet.eyes')}</label><input className="obt-input" placeholder="6A786D" value={petForm.eyes} onChange={e => setPetForm({...petForm, eyes: e.target.value})} /></div>
                  <div className="obt-field"><label>{t('project.pet.body1')}</label><input className="obt-input" placeholder="22565B" value={petForm.body1} onChange={e => setPetForm({...petForm, body1: e.target.value})} /></div>
                  <div className="obt-field"><label>{t('project.pet.body2')}</label><input className="obt-input" placeholder="181B23" value={petForm.body2} onChange={e => setPetForm({...petForm, body2: e.target.value})} /></div>
                  <div className="obt-field"><label>{t('project.pet.extra1')}</label><input className="obt-input" placeholder="4D565C" value={petForm.extra1} onChange={e => setPetForm({...petForm, extra1: e.target.value})} /></div>
                  <div className="obt-field"><label>{t('project.pet.extra2')}</label><input className="obt-input" placeholder="8CABAE" value={petForm.extra2} onChange={e => setPetForm({...petForm, extra2: e.target.value})} /></div>
                </div>
                <div className="obt-field"><label>{t('project.pet.notes')}</label><input className="obt-input" value={petForm.notes} onChange={e => setPetForm({...petForm, notes: e.target.value})} /></div>
                <div className="obt-field"><label>{t('project.pet.mutations')}</label><MutationSelector speciesId={project.species_id} selectedIds={selectedMutationIds} onChange={setSelectedMutationIds} /></div>
                <div className="obt-actions">
                  <button type="submit" className="obt-btn obt-btn--primary">{editingPetId ? t('common.saveChanges') : t('common.add')}</button>
                  <button type="button" className="obt-btn obt-btn--ghost" onClick={resetPetForm}>{t('common.cancel')}</button>
                </div>
              </form>
            </Modal>
            {activeTab === 'starters' ? (
              <><PetTable list={starters.filter(p => p.sex === 'F')} title={t('project.groups.females')} /><PetTable list={starters.filter(p => p.sex === 'M')} title={t('project.groups.males')} /></>
            ) : (
              <><PetTable list={children.filter(p => p.sex === 'F')} title={t('project.groups.females')} /><PetTable list={children.filter(p => p.sex === 'M')} title={t('project.groups.males')} /><PetTable list={children.filter(p => p.sex === 'ND')} title={t('project.groups.unhatched')} /></>
            )}
          </>
        )}

        {/* ---- COPPIE ---- */}
        {activeTab === 'pairs' && (
          <>
            {/* Selettore round */}
            <div className="obt-panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginRight: 4 }}>
                  {t('project.pairs.selectRound')}
                </span>
                {visibleRounds.map(r => {
                  const hasData = existingRounds.includes(r)
                  const isActive = r === activeRound
                  return (
                    <button
                      key={r}
                      onClick={() => setActiveRound(r)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 'var(--radius-pill)',
                        border: isActive ? '2px solid var(--primary)' : '2px solid var(--line)',
                        background: isActive ? 'var(--primary)' : 'var(--surface)',
                        color: isActive ? '#fff' : (hasData ? 'var(--ink)' : 'var(--muted)'),
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {hasData ? `${t('project.pairs.roundLabel')} ${r}` : `+ ${t('project.pairs.newRound')} ${r}`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Griglia cliccabile */}
            <div className="obt-panel">
              <h3 style={{ marginBottom: 16 }}>
                {t('project.pairs.roundLabel')} {activeRound}
                {pairsInActiveRound.length > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>
                    — {pairsInActiveRound.length} {t('project.pairs.pairsCount')}
                  </span>
                )}
              </h3>

              {males.length === 0 || females.length === 0 ? (
                <div style={{ padding: '12px 0' }}>
                  <p className="obt-text-soft" style={{ fontSize: 13 }}>{t('project.pairs.gridNeedBoth')}</p>
                </div>
              ) : (
                <PairGrid
                  round={activeRound}
                  females={females}
                  males={males}
                  pairsInRound={pairsInActiveRound}
                  onCellClick={openCellModal}
                  isOwner={isOwner}
                />
              )}

              {/* Storico coppie del round attivo */}
              {pairsInActiveRound.length > 0 && (
                <div style={{ marginTop: 24, overflowX: 'auto' }}>
                  <table className="obt-table">
                    <thead>
                      <tr>
                        <th>{t('project.pairs.mother')}</th>
                        <th>{t('project.pairs.father')}</th>
                        <th>{t('project.pairs.date')}</th>
                        <th>{t('project.table.notes')}</th>
                        {isOwner && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pairsInActiveRound.map(pair => (
                        <tr key={pair.id}>
                          <td>{pair.mother ? petLabel(pair.mother) : '-'}</td>
                          <td>{pair.father ? petLabel(pair.father) : '-'}</td>
                          <td>{pair.pair_date || '-'}</td>
                          <td>{pair.outcome_notes || ''}</td>
                          {isOwner && (
                            <td>
                              <button
                                className="obt-icon-btn obt-icon-btn--danger"
                                onClick={() => {
                                  const f = females.find(f => f.id === (pair.mother?.id || pair.mother_id))
                                  const m = males.find(m => m.id === (pair.father?.id || pair.father_id))
                                  openCellModal(f || pair.mother, m || pair.father, pair)
                                }}
                                title={t('common.edit')}
                              >
                                <i className="ti ti-pencil" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---- TARGET ---- */}
        {activeTab === 'target' && (
          <>
            <form onSubmit={handleTargetSubmit} className="obt-panel">
              <h2 style={{ marginBottom: 18 }}>{t('project.target.colours')}</h2>
              <div className="obt-row">
                {[
                  { label: t('project.pet.eyes'), key: 'target_eyes' },
                  { label: t('project.pet.body1'), key: 'target_body1' },
                  { label: t('project.pet.body2'), key: 'target_body2' },
                  { label: t('project.pet.extra1'), key: 'target_extra1' },
                  { label: t('project.pet.extra2'), key: 'target_extra2' },
                ].map(({ label, key }) => (
                  <div className="obt-field" key={key}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{label}<ColorCell hex={targetForm[key]} /></label>
                    <input className="obt-input" disabled={!isOwner} value={targetForm[key]} onChange={e => setTargetForm({ ...targetForm, [key]: e.target.value })} placeholder={t('project.target.placeholder')} />
                  </div>
                ))}
              </div>
              {isOwner && <button type="submit" className="obt-btn obt-btn--primary">{t('project.target.save')}</button>}
            </form>
            <div className="obt-panel">
              <h3 style={{ marginBottom: 14 }}>{t('project.target.mutations')}</h3>
              <MutationSelector speciesId={project.species_id} selectedIds={targetMutationIds} onChange={setTargetMutationIds} readOnly={!isOwner} />
              {isOwner && <button className="obt-btn obt-btn--primary obt-mt-md" onClick={handleTargetSubmit}>{t('project.target.saveMutations')}</button>}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default ProjectPage
