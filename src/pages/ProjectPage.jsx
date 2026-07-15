import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MutationSelector from './MutationSelector'
import Modal from './Modal'
import { useT } from '../i18n'
import SuggesterTab from './SuggesterTab'

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
function PairGrid({ round, females, males, pairsInRound, onCellClick, isOwner, forbidden = {} }) {
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

  const [activeChildGen, setActiveChildGen] = useState(null)
  const [showGenRename, setShowGenRename] = useState(false)
  const [genRenameTarget, setGenRenameTarget] = useState(null)
  const [genRenameValue, setGenRenameValue] = useState('')

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

  //Ordine
  const [petSort, setPetSort] = useState({})
  const [showRosterEditor, setShowRosterEditor] = useState(false)
  const [rosterDraft, setRosterDraft] = useState([])

  // Edit progetto
  const [showEditProject, setShowEditProject] = useState(false)
  const [speciesList, setSpeciesList] = useState([])
  const [editProjectForm, setEditProjectForm] = useState({
    name: '', species_id: '', author: '', collaborators: '', project_notes: '', is_public: false
  })
  const [copied, setCopied] = useState(false)

  const [pairsPage, setPairsPage] = useState(1)



  useEffect(() => { loadAll() }, [id])
  useEffect(() => { setShowPetForm(false) }, [activeTab])
  useEffect(() => { setPairsPage(1) }, [activeRound])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: projectData } = await supabase.from('lines').select('*, species(name)').eq('id', id).single()
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

    const { data: petsData } = await supabase.from('pets').select('*').eq('line_id', id).order('code', { ascending: true })
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
      .eq('line_id', id)
      .order('round_number', { ascending: true })
      .order('created_at', { ascending: false })
    setPairs(pairsData || [])

    const { data: projMuts } = await supabase.from('line_mutations').select('mutation_id').eq('line_id', id)
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
      line_id: id, code: petForm.code, sex: petForm.sex,
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
    const { error } = await supabase.from('lines').update(targetForm).eq('id', id)
    if (fail(error, t('project.errors.saveTargetColours'))) return
    const { error: delErr } = await supabase.from('line_mutations').delete().eq('line_id', id)
    if (fail(delErr, t('project.errors.updateTargetMutations'))) return
    if (targetMutationIds.length > 0) {
      const rows = targetMutationIds.map(mutationId => ({ line_id: id, mutation_id: mutationId }))
      const { error: insErr } = await supabase.from('line_mutations').insert(rows)
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
        line_id: id,
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
        line_id: id,
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
    const { error } = await supabase.from('lines').update({
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
    const { error } = await supabase.from('lines').update({ is_public: next }).eq('id', id)
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
    const { error } = await supabase.from('lines').delete().eq('id', id)
    if (fail(error, t('project.errors.deleteProject'))) return
    navigate('/dashboard')
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (!project) return null

  const starters = pets.filter(p => p.generation === 0)
  const children = pets.filter(p => p.generation > 0)
  const childGenerations = [...new Set(children.map(p => p.generation))].sort((a, b) => a - b)
  const currentChildGen = activeChildGen != null && childGenerations.includes(activeChildGen)
    ? activeChildGen
    : (childGenerations[0] ?? null)
  const genChildren = children.filter(p => p.generation === currentChildGen)
  const males = pets.filter(p => p.sex === 'M')
  const females = pets.filter(p => p.sex === 'F')

  // Roster del round: di default la generazione precedente (round 1 → gen 0, round 2 → gen 1, ...)
  const rosterFor = (round) => {
    const override = project?.round_rosters?.[String(round)]
    const inRoster = override
      ? (p) => override.includes(p.id)
      : (p) => p.generation === round - 1
    return {
      females: females.filter(inRoster),
      males: males.filter(inRoster),
    }
  }
  const activeRoster = rosterFor(activeRound)

  // --- Consanguineità: antenati visibili fino ai bisnonni (profondità 3) ---
  const kinshipInfo = (() => {
    const petById = new Map(pets.map(p => [p.id, p]))
    const cache = new Map()
    const ancestors = (id) => {
      if (cache.has(id)) return cache.get(id)
      const res = new Map()
      const stack = [[id, 0]]
      while (stack.length) {
        const [cur, depth] = stack.pop()
        if (cur == null) continue
        const prev = res.get(cur)
        if (prev != null && prev <= depth) continue
        res.set(cur, depth)
        if (depth < 3) {
          const p = petById.get(cur)
          if (p) { stack.push([p.mother_id, depth + 1]); stack.push([p.father_id, depth + 1]) }
        }
      }
      cache.set(id, res)
      return res
    }
    const tierKeys = ['direct', 'parent', 'grandparent', 'greatgrandparent']
    const map = {}
    for (const f of activeRoster.females) {
      for (const m of activeRoster.males) {
        const A = ancestors(f.id), B = ancestors(m.id)
        let best = null, count = 0
        for (const [aid, da] of A) {
          if (B.has(aid)) {
            count++
            const d = Math.min(da, B.get(aid))
            if (!best || d < best.d) best = { id: aid, d }
          }
        }
        if (!best) continue
        const anc = petById.get(best.id)
        const who = anc ? `${anc.letter ? anc.letter + ' ' : ''}${anc.code}/${anc.sex}` : '?'
        const extra = count - 1
        map[`${f.id}:${m.id}`] = { label: `${t('project.kin.' + tierKeys[best.d])} · ${who}${extra > 0 ? ` +${extra}` : ''}` }
      }
    }
    return map
  })()

  const rosterIsCustom = !!project?.round_rosters?.[String(activeRound)]

  const openRosterEditor = () => {
    setRosterDraft([...activeRoster.females, ...activeRoster.males].map(p => p.id))
    setShowRosterEditor(true)
  }
  const toggleRosterPet = (petId) => {
    setRosterDraft(prev => prev.includes(petId) ? prev.filter(x => x !== petId) : [...prev, petId])
  }
  const saveRoster = async () => {
    setActionError('')
    const next = { ...(project.round_rosters || {}), [String(activeRound)]: rosterDraft }
    const { error } = await supabase.from('lines').update({ round_rosters: next }).eq('id', id)
    if (fail(error, t('project.roster.saveError'))) return
    setShowRosterEditor(false)
    loadAll()
  }
  const resetRoster = async () => {
    setActionError('')
    const next = { ...(project.round_rosters || {}) }
    delete next[String(activeRound)]
    const { error } = await supabase.from('lines').update({ round_rosters: next }).eq('id', id)
    if (fail(error, t('project.roster.saveError'))) return
    setShowRosterEditor(false)
    loadAll()
  }

  const genLabel = (g) => project?.generation_labels?.[String(g)] || `G${g}`
  const openGenRename = (g) => {
    setGenRenameTarget(g)
    setGenRenameValue(project?.generation_labels?.[String(g)] || '')
    setShowGenRename(true)
  }
  const saveGenLabel = async () => {
    setActionError('')
    const next = { ...(project.generation_labels || {}) }
    const v = genRenameValue.trim()
    if (v) next[String(genRenameTarget)] = v
    else delete next[String(genRenameTarget)]
    const { error } = await supabase.from('lines').update({ generation_labels: next }).eq('id', id)
    if (fail(error, t('project.gen.saveError'))) return
    setShowGenRename(false)
    loadAll()
  }

  // Calcola i round esistenti
  const existingRounds = [...new Set(pairs.map(p => p.round_number || 1))].sort((a, b) => a - b)
  const maxRound = existingRounds.length > 0 ? Math.max(...existingRounds) : 0
  // Round visibili: quelli esistenti + uno nuovo sempre disponibile
  const visibleRounds = existingRounds.includes(maxRound + 1)
    ? existingRounds
    : [...existingRounds, maxRound + 1]

  const pairsInActiveRound = pairs.filter(p => (p.round_number || 1) === activeRound)

  const PAIRS_PER_PAGE = 15
  const pairsTotalPages = Math.max(1, Math.ceil(pairsInActiveRound.length / PAIRS_PER_PAGE))
  const pairsPageSafe = Math.min(pairsPage, pairsTotalPages)
  const pairsPageItems = pairsInActiveRound.slice((pairsPageSafe - 1) * PAIRS_PER_PAGE, pairsPageSafe * PAIRS_PER_PAGE)

  const PetTable = ({ list, title }) => {
    const sort = petSort[title] || { key: null, dir: 1 }
    const applySort = (key) =>
      setPetSort(prev => {
        const cur = prev[title] || { key: null, dir: 1 }
        const next = cur.key === key ? { key, dir: -cur.dir } : { key, dir: 1 }
        return { ...prev, [title]: next }
      })
    const slotKeys = ['eyes', 'body1', 'body2', 'extra1', 'extra2']
    const sortVal = (pet, key) => {
      if (key === 'gen') return pet.generation ?? 0
      if (key === 'mut') return petMutationCounts[pet.id] || 0
      if (key === 'distance') return totalDist(pet)
      if (slotKeys.includes(key)) return colorDist(pet[key], project['target_' + key])
      return (pet[key] ?? '').toString().toLowerCase()
    }
    const sorted = sort.key
      ? [...list].sort((a, b) => {
          const va = sortVal(a, sort.key), vb = sortVal(b, sort.key)
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          if (va < vb) return -sort.dir
          if (va > vb) return sort.dir
          return 0
        })
      : list
    const Th = ({ k, children }) => (
      <th onClick={() => applySort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} title={t('project.table.sortHint')}>
        {children}
        <span style={{ marginLeft: 4, fontSize: 10, opacity: sort.key === k ? 0.9 : 0.25 }}>
          {sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}
        </span>
      </th>
    )
    return (
      <div className="obt-panel">
        <h3 style={{ marginBottom: 14 }}>{title}</h3>
        {list.length === 0 ? (
          <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>{t('common.none')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="obt-table">
              <thead>
                <tr>
                  <Th k="code">{t('project.table.code')}</Th>
                  <Th k="sex">{t('project.table.sex')}</Th>
                  <Th k="letter">{t('project.table.letter')}</Th>
                  <Th k="gen">{t('project.table.gen')}</Th>
                  <Th k="eyes">{t('project.table.eyes')}</Th>
                  <Th k="body1">{t('project.table.body1')}</Th>
                  <Th k="body2">{t('project.table.body2')}</Th>
                  <Th k="extra1">{t('project.table.extra1')}</Th>
                  <Th k="extra2">{t('project.table.extra2')}</Th>
                  <Th k="mut">{t('project.table.mut')}</Th>
                  <Th k="distance">{t('project.table.distance')}</Th>
                  <Th k="notes">{t('project.table.notes')}</Th>
                  {isOwner && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map(pet => {
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
  }

  const tabLabels = {
    starters: t('project.tabs.starters'),
    children: t('project.tabs.children'),
    pairs: t('project.tabs.pairs'),
    suggester: t('project.tabs.suggester'),
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
          {['starters', 'children', 'pairs', 'suggester', 'target'].map(tab => (
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
            ) : childGenerations.length === 0 ? (
              <PetTable list={[]} title={t('project.groups.females')} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {childGenerations.map(g => (
                    <button
                      key={g}
                      onClick={() => setActiveChildGen(g)}
                      style={{
                        padding: '6px 16px', borderRadius: 'var(--radius-pill)',
                        border: g === currentChildGen ? '2px solid var(--primary)' : '2px solid var(--line)',
                        background: g === currentChildGen ? 'var(--primary)' : 'var(--surface)',
                        color: g === currentChildGen ? '#fff' : 'var(--ink)',
                        fontWeight: g === currentChildGen ? 700 : 500, fontSize: 13,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {genLabel(g)}
                    </button>
                  ))}
                  {isOwner && currentChildGen != null && (
                    <button className="obt-icon-btn" onClick={() => openGenRename(currentChildGen)} title={t('project.gen.rename')}>
                      <i className="ti ti-pencil" />
                    </button>
                  )}
                </div>
                <PetTable list={genChildren.filter(p => p.sex === 'F')} title={t('project.groups.females')} />
                <PetTable list={genChildren.filter(p => p.sex === 'M')} title={t('project.groups.males')} />
                <PetTable list={genChildren.filter(p => p.sex === 'ND')} title={t('project.groups.unhatched')} />
                <Modal open={showGenRename} onClose={() => setShowGenRename(false)} title={t('project.gen.renameTitle')} size="sm">
                  <div className="obt-field">
                    <label>{t('project.gen.name')}</label>
                    <input className="obt-input" value={genRenameValue} onChange={e => setGenRenameValue(e.target.value)} placeholder={genRenameTarget != null ? `G${genRenameTarget}` : ''} autoFocus />
                  </div>
                  <p className="obt-text-soft" style={{ fontSize: 12, marginTop: 4 }}>{t('project.gen.renameHint')}</p>
                  <div className="obt-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="obt-btn obt-btn--primary" onClick={saveGenLabel}>{t('common.saveChanges')}</button>
                    <button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowGenRename(false)}>{t('common.cancel')}</button>
                  </div>
                </Modal>
              </>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>
                  {t('project.pairs.roundLabel')} {activeRound}
                  {pairsInActiveRound.length > 0 && (
                    <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>
                      — {pairsInActiveRound.length} {t('project.pairs.pairsCount')}
                    </span>
                  )}
                </h3>
                {isOwner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="obt-text-soft" style={{ fontSize: 12 }}>
                      {rosterIsCustom ? t('project.roster.custom') : t('project.roster.auto', { gen: activeRound - 1 })}
                    </span>
                    <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openRosterEditor}>
                      ✎ {t('project.roster.edit')}
                    </button>
                  </div>
                )}
              </div>

              <Modal open={showRosterEditor} onClose={() => setShowRosterEditor(false)} title={`${t('project.roster.title')} — ${t('project.pairs.roundLabel')} ${activeRound}`} size="lg">
                <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 16 }}>{t('project.roster.hint')}</p>
                <div className="obt-row">
                  <div className="obt-field" style={{ minWidth: 220 }}>
                    <label>♀ {t('project.groups.females')}</label>
                    {females.length === 0 ? <p className="obt-text-soft" style={{ fontSize: 13 }}>{t('common.none')}</p> : females.map(f => (
                      <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="checkbox" checked={rosterDraft.includes(f.id)} onChange={() => toggleRosterPet(f.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        {petLabel(f)} <span className="obt-text-soft" style={{ fontSize: 11 }}>· G{f.generation}</span>
                      </label>
                    ))}
                  </div>
                  <div className="obt-field" style={{ minWidth: 220 }}>
                    <label>♂ {t('project.groups.males')}</label>
                    {males.length === 0 ? <p className="obt-text-soft" style={{ fontSize: 13 }}>{t('common.none')}</p> : males.map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="checkbox" checked={rosterDraft.includes(m.id)} onChange={() => toggleRosterPet(m.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        {petLabel(m)} <span className="obt-text-soft" style={{ fontSize: 11 }}>· G{m.generation}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="obt-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="obt-btn obt-btn--primary" onClick={saveRoster}>{t('common.saveChanges')}</button>
                  <button type="button" className="obt-btn obt-btn--ghost" onClick={resetRoster}>{t('project.roster.reset')}</button>
                  <button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowRosterEditor(false)}>{t('common.cancel')}</button>
                </div>
              </Modal>

              {activeRoster.males.length === 0 || activeRoster.females.length === 0 ? (
                <div style={{ padding: '12px 0' }}>
                  <p className="obt-text-soft" style={{ fontSize: 13 }}>{t('project.pairs.gridNeedBoth')}</p>
                </div>
              ) : (
                <PairGrid
                  round={activeRound}
                  females={activeRoster.females}
                  males={activeRoster.males}
                  pairsInRound={pairsInActiveRound}
                  onCellClick={openCellModal}
                  isOwner={isOwner}
                  forbidden={kinshipInfo}
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
                      {pairsPageItems.map(pair => (
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
                  {pairsTotalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
                      <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setPairsPage(p => Math.max(1, p - 1))} disabled={pairsPageSafe <= 1}>
                        ← {t('project.pairs.prev')}
                      </button>
                      <span className="obt-text-soft" style={{ fontSize: 13, fontWeight: 600 }}>
                        {t('project.pairs.pageOf', { page: pairsPageSafe, total: pairsTotalPages })}
                      </span>
                      <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setPairsPage(p => Math.min(pairsTotalPages, p + 1))} disabled={pairsPageSafe >= pairsTotalPages}>
                        {t('project.pairs.next')} →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'suggester' && (
          <SuggesterTab pets={pets} project={project} />
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