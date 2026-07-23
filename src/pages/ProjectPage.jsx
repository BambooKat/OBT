import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MutationSelector from './MutationSelector'
import { effectiveCooldown } from './research'
import Modal from './Modal'
import Help from './Help'
import PetTable, { ColorCell } from './PetTable'
import PairGrid, { PairCellModal } from './PairGrid'
import { useT } from '../i18n'
import InspectorTab from './InspectorTab'
import { todayISO, normalizeHex, petLabel, downloadCsv, petsToRows } from './petUtils'

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
  const [researchLevel, setResearchLevel] = useState(1)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const [activeChildGen, setActiveChildGen] = useState(null)
  // sotto-tab F / M / ND della sezione Figli, ricordata per linea
  const [childSexTab, setChildSexTab] = useState(() => {
    try { return localStorage.getItem('obt.childSexTab.' + id) || 'F' } catch { return 'F' }
  })
  const selectChildSexTab = (v) => {
    setChildSexTab(v)
    try { localStorage.setItem('obt.childSexTab.' + id, v) } catch { /* storage non disponibile */ }
  }
  const [showGenRename, setShowGenRename] = useState(false)
  const [genRenameTarget, setGenRenameTarget] = useState(null)
  const [genRenameValue, setGenRenameValue] = useState('')

  // Form pet
  const [showPetForm, setShowPetForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState(null)
  const [petForm, setPetForm] = useState({
    name: '', sex: 'M', code: '', generation: 0,
    mother_id: '', father_id: '',
    colors: {}, notes: ''
  })
  const [selectedMutationIds, setSelectedMutationIds] = useState([])
  const [petMutationIds, setPetMutationIds] = useState({})

  // Target
  const [targetForm, setTargetForm] = useState({ colors: {} })
  const [targetMutationIds, setTargetMutationIds] = useState([])
  const [targetSaved, setTargetSaved] = useState(null)

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
  const [containerList, setContainerList] = useState([])   // progetti-contenitore dell'utente
  const [editProjectForm, setEditProjectForm] = useState({
    name: '', species_id: '', author: '', collaborators: '', project_notes: '', is_public: false, project_id: ''
  })
  const [copied, setCopied] = useState(false)

  const [pairsPage, setPairsPage] = useState(1)



  useEffect(() => { loadAll() }, [id])
  useEffect(() => { setShowPetForm(false) }, [activeTab])
  useEffect(() => { setPairsPage(1) }, [activeRound])

  const firstLoadRef = useRef(true)
  const loadAll = useCallback(async () => {
    // spinner a tutta pagina solo al primo caricamento: nei refresh dopo un
    // salvataggio la pagina resta montata, così non si perde la posizione di scroll
    if (firstLoadRef.current) setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: projectData } = await supabase.from('lines').select('*, species(name, color_slots, cooldown_hours)').eq('id', id).single()
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
      project_id: projectData.project_id || '',
    })
    setTargetForm({ colors: projectData.target_colors || {} })

    const { data: speciesData } = await supabase.from('species').select('*').order('name', { ascending: true })
    setSpeciesList(speciesData || [])

    // progetti-contenitore in cui questa linea può essere spostata
    if (user && user.id === projectData.owner_id) {
      const { data: contData } = await supabase.from('projects').select('id, name')
        .eq('owner_id', user.id).order('name', { ascending: true })
      setContainerList(contData || [])
    }

    const { data: petsData } = await supabase.from('pets').select('*').eq('line_id', id).order('name', { ascending: true })
    setPets(petsData || [])

    if (petsData && petsData.length > 0) {
      const petIds = petsData.map(p => p.id)
      const { data: petMutsData } = await supabase.from('pet_mutations').select('pet_id, mutation_id').in('pet_id', petIds)
      const map = {}
      ;(petMutsData || []).forEach(pm => {
        (map[pm.pet_id] ||= []).push(pm.mutation_id)
      })
      setPetMutationIds(map)
    } else {
      setPetMutationIds({})
    }

    const { data: pairsData } = await supabase
      .from('pairs')
      .select('*, mother:mother_id(id, name, code), father:father_id(id, name, code)')
      .eq('line_id', id)
      .order('round_number', { ascending: true })
      .order('created_at', { ascending: false })
    setPairs(pairsData || [])

    if (user && projectData?.species_id) {
      const { data: usRow } = await supabase.from('user_species')
        .select('research_level').eq('user_id', user.id).eq('species_id', projectData.species_id).maybeSingle()
      setResearchLevel(usRow?.research_level || 1)
    }

    const { data: projMuts } = await supabase.from('line_mutations').select('mutation_id').eq('line_id', id)
    setTargetMutationIds((projMuts || []).map(pm => pm.mutation_id))

    firstLoadRef.current = false

    setLoading(false)
  }, [id, navigate])

  const hexToRgb = (hex) => {
    if (!hex) return null
    const h = hex.trim().replace('#', '')
    if (h.length !== 6) return null
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }

  const colorDist = (h1, h2) => {
    const a = hexToRgb(h1), b = hexToRgb(h2)
    if (!a || !b) return null
    return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)
  }

  const DEFAULT_SLOTS = ['eyes', 'body1', 'body2', 'extra1', 'extra2']
  const slots = (project?.species?.color_slots && project.species.color_slots.length)
    ? project.species.color_slots : DEFAULT_SLOTS
  const slotLabel = (key) => t('project.slot.' + key)

  const totalDist = (pet) => {
    if (!project) return null
    const target = project.target_colors || {}
    const petColors = pet.colors || {}
    let total = 0, count = 0
    for (const s of slots) {
      const d = colorDist(petColors[s], target[s])
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
    setPetForm({ name: '', sex: 'M', code: '', generation: 0, mother_id: '', father_id: '', colors: {}, notes: '' })
    setSelectedMutationIds([])
    setEditingPetId(null)
    setShowPetForm(false)
  }

  // Quando scegli un genitore nel form, la generazione si ricalcola da sola:
  // max(gen madre, gen padre) + 1. Resta comunque modificabile a mano.
  const withDerivedGen = (form) => {
    const mum = pets.find(p => p.id === form.mother_id)
    const dad = pets.find(p => p.id === form.father_id)
    if (!mum && !dad) return form
    const gen = Math.max(mum?.generation ?? 0, dad?.generation ?? 0) + 1
    return { ...form, generation: gen }
  }

  const openNewPetForm = (prefill = {}) => {
    resetPetForm()
    setPetForm(prev => ({
      ...prev,
      generation: activeTab === 'children' ? (currentChildGen ?? 1) : 0,
      ...prefill,
    }))
    setShowPetForm(true)
  }

  const handlePetSubmit = async (e) => {
    e.preventDefault()
    setActionError('')
    const cleanColors = {}
    for (const k of Object.keys(petForm.colors || {})) {
      const norm = normalizeHex(petForm.colors[k])
      if (norm) cleanColors[k] = norm
    }
    const payload = {
      line_id: id, name: petForm.name, sex: petForm.sex,
      code: petForm.code || null, generation: parseInt(petForm.generation) || 0,
      mother_id: petForm.mother_id || null, father_id: petForm.father_id || null,
      colors: cleanColors, notes: petForm.notes || null,
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
      name: pet.name, sex: pet.sex, code: pet.code || '', generation: pet.generation,
      mother_id: pet.mother_id || '', father_id: pet.father_id || '',
      colors: pet.colors || {}, notes: pet.notes || ''
    })
    const { data: petMuts } = await supabase.from('pet_mutations').select('mutation_id').eq('pet_id', pet.id)
    setSelectedMutationIds((petMuts || []).map(pm => pm.mutation_id))
    setEditingPetId(pet.id)
    setShowPetForm(true)
  }

  const handleDeletePet = async (petId) => {
    const pet = pets.find(p => p.id === petId)
    if (!window.confirm(t('project.confirm.deletePet', { code: pet?.name || '' }))) return
    setActionError('')
    const { error } = await supabase.from('pets').delete().eq('id', petId)
    if (fail(error, t('project.errors.deletePet'))) return
    loadAll()
  }

  const handleTargetSubmit = async (e, which = 'colors') => {
    if (e && e.preventDefault) e.preventDefault()
    setActionError('')
    // pulisce ogni slot prima di scrivere: niente spazi o cancelletti mancanti
    const cleanColors = {}
    for (const [slot, val] of Object.entries(targetForm.colors || {})) {
      const norm = normalizeHex(val)
      if (norm) cleanColors[slot] = norm
    }
    const { error } = await supabase.from('lines').update({ target_colors: cleanColors }).eq('id', id)
    if (fail(error, t('project.errors.saveTargetColours'))) return
    const { error: delErr } = await supabase.from('line_mutations').delete().eq('line_id', id)
    if (fail(delErr, t('project.errors.updateTargetMutations'))) return
    if (targetMutationIds.length > 0) {
      const rows = targetMutationIds.map(mutationId => ({ line_id: id, mutation_id: mutationId }))
      const { error: insErr } = await supabase.from('line_mutations').insert(rows)
      if (fail(insErr, t('project.errors.saveTargetMutations'))) return
    }
    setTargetSaved(which)
    setTimeout(() => setTargetSaved(null), 2500)
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
        pair_at: date === todayISO() ? new Date().toISOString() : null,
        outcome_notes: notes || null,
      })
      if (fail(error, t('project.errors.registerPair'))) return
    }

    // Se c'è un codice figlio, crea il pet ND
    if (childCode.trim()) {
      const { error } = await supabase.from('pets').insert({
        line_id: id,
        name: childCode.trim(),
        sex: 'ND',
        // la generazione nasce dai genitori: figli di G1 sono G2, non G1
        generation: Math.max(female.generation ?? 0, male.generation ?? 0) + 1,
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
      project_id: editProjectForm.project_id || null,
    }).eq('id', id)
    if (fail(error, t('project.errors.saveProject'))) return
    setShowEditProject(false)
    loadAll()
  }

  const shareUrl = `${window.location.origin}/line/${id}`

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
    navigate(project?.project_id ? `/project/${project.project_id}` : '/dashboard')
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
        const who = anc ? `${anc.code ? anc.code + ' ' : ''}${anc.name}/${anc.sex}` : '?'
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

  // Aggiorna un singolo campo del pet direttamente dalla riga della tabella.
  // Update ottimistico: la UI cambia subito, e in caso di errore si rimette a posto.
  const updatePetField = async (petId, patch) => {
    const before = pets.find(p => p.id === petId)
    setPets(prev => prev.map(p => (p.id === petId ? { ...p, ...patch } : p)))
    const { error } = await supabase.from('pets').update(patch).eq('id', petId)
    if (error) {
      setPets(prev => prev.map(p => (p.id === petId ? before : p)))
      setActionError(t('project.errors.savePet'))
      return false
    }
    setActionError('')
    return true
  }

  // esporta la lista attualmente mostrata: rispetta tab e generazione scelte
  const petsById = Object.fromEntries(pets.map(p => [p.id, p]))
  const exportList = (list, suffix) => {
    const rows = petsToRows(list, { slots, project, petsById, petMutationIds, targetMutationIds })
    const slug = (project?.name || 'linea').replace(/[^\w-]+/g, '_')
    downloadCsv(rows, `${slug}_${suffix}.csv`)
  }

  const tableCtx = {
    petSort, setPetSort, slots, slotLabel, totalDist, colorDist, project,
    petMutationIds, targetMutationIds, isOwner, handleEditPet, handleDeletePet, t, distClass,
    updatePetField,
  }

  const PAIRS_PER_PAGE = 15
  const pairsTotalPages = Math.max(1, Math.ceil(pairsInActiveRound.length / PAIRS_PER_PAGE))
  const pairsPageSafe = Math.min(pairsPage, pairsTotalPages)
  const pairsPageItems = pairsInActiveRound.slice((pairsPageSafe - 1) * PAIRS_PER_PAGE, pairsPageSafe * PAIRS_PER_PAGE)

  const tabLabels = {
    starters: t('project.tabs.starters'),
    children: t('project.tabs.children'),
    pairs: t('project.tabs.pairs'),
    inspector: t('project.tabs.lab'),
    target: t('project.tabs.target')
  }

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate(project?.project_id ? `/project/${project.project_id}` : '/dashboard')}>&larr; {project?.project_id ? t('project.backToProject') : t('project.back')}</button>
            {isOwner && <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setShowEditProject(true)}><i className="ti ti-pencil" /> {t('project.edit')}</button>}
            {isOwner && (
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={handleToggleVisibility} title={project.is_public ? t('project.publicTitle') : t('project.privateTitle')}>
                {project.is_public ? <><i className="ti ti-lock-open" /> {t('project.public')}</> : <><i className="ti ti-lock" /> {t('project.private')}</>}
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
          {['starters', 'children', 'pairs', 'inspector', 'target'].map(tab => (
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
          <div className="obt-field">
            <label>{t('project.container')} <span className="obt-optional">{t('common.optional')}</span></label>
            <select className="obt-select" value={editProjectForm.project_id}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, project_id: e.target.value })}>
              <option value="">{t('project.containerNone')}</option>
              {containerList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="obt-hint" style={{ marginTop: 6 }}>{t('project.containerHint')}</p>
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
            {activeTab === 'starters' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button className="obt-btn obt-btn--ghost obt-btn--sm"
                    disabled={starters.length === 0}
                    onClick={() => exportList(starters, 'G0')}
                    title={t('project.export.hint')}>
                    <i className="ti ti-download" /> {t('project.export.csv')}
                  </button>
                </div>
                <PetTable list={starters.filter(p => p.sex === 'F')} title={t('project.groups.females')} ctx={tableCtx} />
                <PetTable list={starters.filter(p => p.sex === 'M')} title={t('project.groups.males')} ctx={tableCtx} />
              </>
            ) : childGenerations.length === 0 ? (
              <PetTable list={[]} title={t('project.groups.females')} ctx={tableCtx} />
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
                {(() => {
                  const groups = [
                    { key: 'F', label: t('project.groups.females'), list: genChildren.filter(p => p.sex === 'F') },
                    { key: 'M', label: t('project.groups.males'), list: genChildren.filter(p => p.sex === 'M') },
                    { key: 'ND', label: t('project.groups.unhatched'), list: genChildren.filter(p => p.sex === 'ND') },
                    { key: 'ALL', label: t('project.groups.all'), list: genChildren },
                  ]
                  const active = groups.find(g => g.key === childSexTab) || groups[0]
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div className="obt-subtabs" style={{ flex: 1 }}>
                          {groups.map(g => (
                            <button
                              key={g.key}
                              className={'obt-subtab' + (g.key === active.key ? ' is-active' : '')}
                              onClick={() => selectChildSexTab(g.key)}
                            >
                              {g.label}
                              <span className="obt-subtab__count">{g.list.length}</span>
                            </button>
                          ))}
                        </div>
                        <button className="obt-btn obt-btn--ghost obt-btn--sm"
                          disabled={active.list.length === 0}
                          onClick={() => exportList(active.list, `G${currentChildGen}_${active.key}`)}
                          title={t('project.export.hint')}>
                          <i className="ti ti-download" /> {t('project.export.csv')}
                        </button>
                      </div>
                      <PetTable list={active.list} title={active.label} ctx={tableCtx} />
                    </>
                  )
                })()}
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
                      <i className="ti ti-pencil" /> {t('project.roster.edit')}
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
                  allPairs={pairs}
                  cooldownHours={effectiveCooldown(project?.species?.cooldown_hours, researchLevel)}
                  now={now}
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

        {activeTab === 'inspector' && (
          <InspectorTab pets={pets} project={project} isOwner={isOwner} onEditPet={handleEditPet} />
        )}

        {/* ---- TARGET ---- */}
        {activeTab === 'target' && (
          <>
            <form onSubmit={handleTargetSubmit} className="obt-panel">
              <h2 style={{ marginBottom: 18 }}>{t('project.target.colours')}</h2>
              <div className="obt-row">
                {slots.map(s => (
                  <div className="obt-field" key={s}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{slotLabel(s)}<ColorCell hex={(targetForm.colors || {})[s]} showHex /></label>
                    <input className="obt-input" disabled={!isOwner} value={(targetForm.colors || {})[s] || ''} onChange={e => setTargetForm({ ...targetForm, colors: { ...targetForm.colors, [s]: e.target.value } })} onBlur={e => { const n = normalizeHex(e.target.value); if (n) setTargetForm({ ...targetForm, colors: { ...targetForm.colors, [s]: n } }) }} placeholder={t('project.target.placeholder')} />
                  </div>
                ))}
              </div>
              {isOwner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="submit" className="obt-btn obt-btn--primary">{t('project.target.save')}</button>
                  {targetSaved === 'colors' && <span style={{ color: 'var(--good-text)', fontWeight: 700, fontSize: 13 }}>✓ {t('common.saved')}</span>}
                </div>
              )}
            </form>
            <div className="obt-panel">
              <h3 style={{ marginBottom: 14 }}>{t('project.target.mutations')}</h3>
              <MutationSelector speciesId={project.species_id} selectedIds={targetMutationIds} onChange={setTargetMutationIds} readOnly={!isOwner} />
              {isOwner && (
                <div className="obt-mt-md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="obt-btn obt-btn--primary" onClick={e => handleTargetSubmit(e, 'mutations')}>{t('project.target.saveMutations')}</button>
                  {targetSaved === 'mutations' && <span style={{ color: 'var(--good-text)', fontWeight: 700, fontSize: 13 }}>✓ {t('common.saved')}</span>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Form pet: fuori dai tab, così è raggiungibile anche dal Laboratorio */}
      <Modal open={showPetForm} onClose={resetPetForm} title={editingPetId ? t('project.pet.editTitle') : (activeTab === 'starters' ? t('project.pet.newStarter') : t('project.pet.newChild'))} size="lg">
        <form onSubmit={handlePetSubmit}>
          <div className="obt-row">
            <div className="obt-field"><label>{t('project.pet.name')} <Help text={t('project.help.name')} /></label><input className="obt-input" value={petForm.name} onChange={e => setPetForm({...petForm, name: e.target.value})} required /></div>
            <div className="obt-field"><label>{t('project.pet.sex')}</label><select className="obt-select" value={petForm.sex} onChange={e => setPetForm({...petForm, sex: e.target.value})}><option value="M">M</option><option value="F">F</option><option value="ND">ND</option></select></div>
            <div className="obt-field"><label>{t('project.pet.code')} <Help text={t('project.help.code')} /></label><input className="obt-input" value={petForm.code} onChange={e => setPetForm({...petForm, code: e.target.value})} /></div>
            <div className="obt-field"><label>{t('project.pet.generation')}</label><input type="number" min="0" className="obt-input" value={petForm.generation} onChange={e => setPetForm({...petForm, generation: e.target.value})} /></div>
          </div>
          {petForm.generation > 0 && (
            <div className="obt-row">
              <div className="obt-field">
                <label>{t('project.pet.mother')}</label>
                <select className="obt-select" value={petForm.mother_id} onChange={e => setPetForm(withDerivedGen({...petForm, mother_id: e.target.value}))}>
                  <option value="">{t('project.pet.noMother')}</option>
                  {females.map(f => <option key={f.id} value={f.id}>{petLabel(f)}</option>)}
                </select>
              </div>
              <div className="obt-field">
                <label>{t('project.pet.father')}</label>
                <select className="obt-select" value={petForm.father_id} onChange={e => setPetForm(withDerivedGen({...petForm, father_id: e.target.value}))}>
                  <option value="">{t('project.pet.noFather')}</option>
                  {males.map(m => <option key={m.id} value={m.id}>{petLabel(m)}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="obt-row">
            {slots.map(s => (
              <div className="obt-field" key={s}>
                <label>{slotLabel(s)} <Help text={t('project.help.color')} /></label>
                <input className="obt-input" placeholder="000000" value={(petForm.colors || {})[s] || ''} onChange={e => setPetForm({ ...petForm, colors: { ...petForm.colors, [s]: e.target.value } })} onBlur={e => { const n = normalizeHex(e.target.value); if (n) setPetForm({ ...petForm, colors: { ...petForm.colors, [s]: n } }) }} />
              </div>
            ))}
          </div>
          <div className="obt-field"><label>{t('project.pet.notes')}</label><input className="obt-input" value={petForm.notes} onChange={e => setPetForm({...petForm, notes: e.target.value})} /></div>
          <div className="obt-field"><label>{t('project.pet.mutations')}</label><MutationSelector speciesId={project.species_id} selectedIds={selectedMutationIds} onChange={setSelectedMutationIds} /></div>
          <div className="obt-actions">
            <button type="submit" className="obt-btn obt-btn--primary">{editingPetId ? t('common.saveChanges') : t('common.add')}</button>
            <button type="button" className="obt-btn obt-btn--ghost" onClick={resetPetForm}>{t('common.cancel')}</button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ProjectPage