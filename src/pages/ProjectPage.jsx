import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MutationSelector from './MutationSelector'
import Modal from './Modal'

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

function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [pets, setPets] = useState([])
  const [pairs, setPairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('starters')
  const [isOwner, setIsOwner] = useState(false)

  const [showPetForm, setShowPetForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState(null)
  const [petForm, setPetForm] = useState({
    code: '', sex: 'M', letter: '', generation: 0,
    mother_id: '', father_id: '',
    eyes: '', body1: '', body2: '', extra1: '', extra2: '', notes: ''
  })
  const [selectedMutationIds, setSelectedMutationIds] = useState([])
  const [petMutationCounts, setPetMutationCounts] = useState({})

  const [targetForm, setTargetForm] = useState({
    target_eyes: '', target_body1: '', target_body2: '', target_extra1: '', target_extra2: ''
  })
  const [targetMutationIds, setTargetMutationIds] = useState([])

  const [showPairForm, setShowPairForm] = useState(false)
  const [pairForm, setPairForm] = useState({ mother_id: '', father_id: '', pair_date: '', outcome_notes: '' })

  const [showEditProject, setShowEditProject] = useState(false)
  const [speciesList, setSpeciesList] = useState([])
  const [editProjectForm, setEditProjectForm] = useState({
    name: '', species_id: '', author: '', collaborators: '', project_notes: ''
  })

  useEffect(() => { loadAll() }, [id])
  useEffect(() => { setShowPetForm(false); setShowPairForm(false) }, [activeTab])

  const loadAll = async () => {
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

    const { data: pairsData } = await supabase.from('pairs').select('*, mother:mother_id(code), father:father_id(code)').eq('project_id', id).order('created_at', { ascending: false })
    setPairs(pairsData || [])

    const { data: projMuts } = await supabase.from('project_mutations').select('mutation_id').eq('project_id', id)
    setTargetMutationIds((projMuts || []).map(pm => pm.mutation_id))

    setLoading(false)
  }

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

  const resetPetForm = () => {
    setPetForm({ code: '', sex: 'M', letter: '', generation: 0, mother_id: '', father_id: '', eyes: '', body1: '', body2: '', extra1: '', extra2: '', notes: '' })
    setSelectedMutationIds([])
    setEditingPetId(null)
    setShowPetForm(false)
  }

  const openNewPetForm = () => {
    resetPetForm()
    setPetForm(prev => ({ ...prev, generation: activeTab === 'children' ? 1 : 0 }))
    setShowPetForm(true)
  }

  const handleEditPet = (pet) => {
    setEditingPetId(pet.id)
    setPetForm({
      code: pet.code || '', sex: pet.sex || 'M', letter: pet.letter || '', generation: pet.generation || 0,
      mother_id: pet.mother_id || '', father_id: pet.father_id || '',
      eyes: pet.eyes || '', body1: pet.body1 || '', body2: pet.body2 || '', extra1: pet.extra1 || '', extra2: pet.extra2 || '', notes: pet.notes || ''
    })
    setShowPetForm(true)
    supabase.from('pet_mutations').select('mutation_id').eq('pet_id', pet.id).then(({ data }) => {
      setSelectedMutationIds((data || []).map(r => r.mutation_id))
    })
  }

  const handlePetSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...petForm, project_id: id, mother_id: petForm.mother_id || null, father_id: petForm.father_id || null }
    let petId = editingPetId
    if (editingPetId) {
      const { error } = await supabase.from('pets').update(payload).eq('id', editingPetId)
      if (error) return
    } else {
      const { data, error } = await supabase.from('pets').insert(payload).select().single()
      if (error) return
      petId = data.id
    }
    await supabase.from('pet_mutations').delete().eq('pet_id', petId)
    if (selectedMutationIds.length > 0) {
      await supabase.from('pet_mutations').insert(selectedMutationIds.map(mutation_id => ({ pet_id: petId, mutation_id })))
    }
    resetPetForm()
    loadAll()
  }

  const handleDeletePet = async (petId) => {
    if (!confirm('Eliminare questo pet?')) return
    await supabase.from('pets').delete().eq('id', petId)
    loadAll()
  }

  const handleTargetSubmit = async (e) => {
    if (e) e.preventDefault()
    await supabase.from('projects').update(targetForm).eq('id', id)
    await supabase.from('project_mutations').delete().eq('project_id', id)
    if (targetMutationIds.length > 0) {
      await supabase.from('project_mutations').insert(targetMutationIds.map(mutation_id => ({ project_id: id, mutation_id })))
    }
    loadAll()
  }

  const closePairForm = () => { setShowPairForm(false); setPairForm({ mother_id: '', father_id: '', pair_date: '', outcome_notes: '' }) }
  const handlePairSubmit = async (e) => {
    e.preventDefault()
    await supabase.from('pairs').insert({ project_id: id, ...pairForm, mother_id: pairForm.mother_id || null, father_id: pairForm.father_id || null })
    closePairForm()
    loadAll()
  }
  const handleDeletePair = async (pairId) => {
    if (!confirm('Eliminare questa coppia?')) return
    await supabase.from('pairs').delete().eq('id', pairId)
    loadAll()
  }

  const handleEditProjectSubmit = async (e) => {
    e.preventDefault()
    await supabase.from('projects').update(editProjectForm).eq('id', id)
    setShowEditProject(false)
    loadAll()
  }

  if (loading) return <div className="obt-loading">Caricamento progetto...</div>
  if (!project) return null

  const starters = pets.filter(p => (p.generation || 0) === 0)
  const children = pets.filter(p => (p.generation || 0) > 0)
  const females = pets.filter(p => p.sex === 'F')
  const males = pets.filter(p => p.sex === 'M')

  const PetTable = ({ list, title }) => (
    <div className="obt-panel" style={{ marginBottom: 18 }}>
      <h3 style={{ marginBottom: 12 }}>{title} ({list.length})</h3>
      {list.length === 0 ? <p className="obt-hint">Nessun pet in questa categoria.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="obt-table">
            <thead><tr><th>Codice</th><th>Sesso</th><th>Gen</th><th>Colori</th><th>Mut</th><th>Dist</th>{isOwner && <th></th>}</tr></thead>
            <tbody>
              {list.map(pet => {
                const d = totalDist(pet)
                return (
                  <tr key={pet.id}>
                    <td><strong>{pet.code}</strong> {pet.letter && `(${pet.letter})`}</td>
                    <td>{pet.sex}</td>
                    <td>{pet.generation}</td>
                    <td style={{ display: 'flex', gap: 4 }}><ColorCell hex={pet.eyes} /><ColorCell hex={pet.body1} /></td>
                    <td>{petMutationCounts[pet.id] || 0}</td>
                    <td>{d !== null ? <span className={`obt-dist-pill ${distClass(d)}`}>{Math.round(d)}</span> : '-'}</td>
                    {isOwner && <td><button className="obt-icon-btn" onClick={() => handleEditPet(pet)}>✏️</button><button className="obt-icon-btn obt-icon-btn--danger" onClick={() => handleDeletePet(pet.id)}>🗑️</button></td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="obt-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: 8 }}>← Torna ai progetti</button>
          <h1>{project.name}</h1>
          <div className="obt-hero-sub">{project.species?.name} · {project.author || ''}</div>
        </div>
        {isOwner && <button className="obt-btn obt-btn--ghost" onClick={() => setShowEditProject(true)}>Modifica progetto</button>}
      </div>

      <div className="obt-tabs">
        {[
          { k: 'starters', l: 'Starter' },
          { k: 'children', l: 'Figli' },
          { k: 'pairs', l: 'Coppie' },
          { k: 'target', l: 'Target' },
        ].map(t => (
          <button key={t.k} className={`obt-tab ${activeTab === t.k ? 'obt-tab--active' : ''}`} onClick={() => setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>

      <div className="obt-page">
        {(activeTab === 'starters' || activeTab === 'children') && (
          <>
            <div className="obt-section-head"><div />{isOwner && <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={openNewPetForm}>+ Aggiungi pet</button>}</div>
            <Modal open={showPetForm} onClose={resetPetForm} title={editingPetId ? 'Modifica pet' : 'Nuovo pet'}>
              <form onSubmit={handlePetSubmit}>
                <div className="obt-row">
                  <div className="obt-field"><label>Codice *</label><input className="obt-input" value={petForm.code} onChange={e => setPetForm({...petForm, code: e.target.value})} required autoFocus /></div>
                  <div className="obt-field"><label>Sesso</label><select className="obt-select" value={petForm.sex} onChange={e => setPetForm({...petForm, sex: e.target.value})}><option value="F">F</option><option value="M">M</option><option value="ND">ND</option></select></div>
                  <div className="obt-field"><label>Gen</label><input className="obt-input" type="number" value={petForm.generation} onChange={e => setPetForm({...petForm, generation: parseInt(e.target.value)||0})} /></div>
                </div>
                <div className="obt-row">
                  <div className="obt-field"><label>Madre</label><select className="obt-select" value={petForm.mother_id} onChange={e => setPetForm({...petForm, mother_id: e.target.value})}><option value="">—</option>{females.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}</select></div>
                  <div className="obt-field"><label>Padre</label><select className="obt-select" value={petForm.father_id} onChange={e => setPetForm({...petForm, father_id: e.target.value})}><option value="">—</option>{males.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}</select></div>
                </div>
                <div className="obt-row">
                  {['eyes','body1','body2','extra1','extra2'].map(k => (
                    <div className="obt-field" key={k}><label>{k}</label><input className="obt-input" value={petForm[k]} onChange={e => setPetForm({...petForm, [k]: e.target.value})} placeholder="es. A0A0A0" /></div>
                  ))}
                </div>
                <div className="obt-field"><label>Mutazioni</label><MutationSelector speciesId={project.species_id} selectedIds={selectedMutationIds} onChange={setSelectedMutationIds} /></div>
                <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">{editingPetId ? 'Salva' : 'Crea'}</button><button type="button" className="obt-btn obt-btn--ghost" onClick={resetPetForm}>Annulla</button></div>
              </form>
            </Modal>

            {activeTab === 'starters' ? (
              <>
                <PetTable list={starters.filter(p => p.sex === 'F')} title="Femmine" />
                <PetTable list={starters.filter(p => p.sex === 'M')} title="Maschi" />
                <PetTable list={starters.filter(p => p.sex === 'ND')} title="Non ancora sessati" />
              </>
            ) : (
              <>
                <PetTable list={children.filter(p => p.sex === 'F')} title="Femmine" />
                <PetTable list={children.filter(p => p.sex === 'M')} title="Maschi" />
                <PetTable list={children.filter(p => p.sex === 'ND')} title="Non ancora sessati" />
              </>
            )}
          </>
        )}

        {activeTab === 'pairs' && (
          <>
            <div className="obt-section-head"><div />{isOwner && <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={() => setShowPairForm(true)}>+ Registra coppia</button>}</div>
            <Modal open={showPairForm} onClose={closePairForm} title="Registra coppia">
              <form onSubmit={handlePairSubmit}>
                <div className="obt-row">
                  <div className="obt-field"><label>Madre</label><select className="obt-select" value={pairForm.mother_id} onChange={e => setPairForm({...pairForm, mother_id: e.target.value})} required autoFocus><option value="">-- seleziona --</option>{females.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}</select></div>
                  <div className="obt-field"><label>Padre</label><select className="obt-select" value={pairForm.father_id} onChange={e => setPairForm({...pairForm, father_id: e.target.value})} required><option value="">-- seleziona --</option>{males.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}</select></div>
                  <div className="obt-field"><label>Data</label><input type="date" className="obt-input" value={pairForm.pair_date} onChange={e => setPairForm({...pairForm, pair_date: e.target.value})} /></div>
                </div>
                <div className="obt-field"><label>Note / esito</label><input className="obt-input" value={pairForm.outcome_notes} onChange={e => setPairForm({...pairForm, outcome_notes: e.target.value})} /></div>
                <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">Registra</button><button type="button" className="obt-btn obt-btn--ghost" onClick={closePairForm}>Annulla</button></div>
              </form>
            </Modal>
            {pairs.length === 0 ? <div className="obt-panel obt-empty"><div className="obt-empty-icon">🥚</div><h3>Nessuna coppia ancora registrata</h3></div> : (
              <div className="obt-panel"><div style={{ overflowX: 'auto' }}><table className="obt-table"><thead><tr><th>Madre</th><th>Padre</th><th>Data</th><th>Note</th>{isOwner && <th></th>}</tr></thead><tbody>{pairs.map(pair => (<tr key={pair.id}><td>{pair.mother?.code || '-'}</td><td>{pair.father?.code || '-'}</td><td>{pair.pair_date || '-'}</td><td>{pair.outcome_notes || ''}</td>{isOwner && <td><button className="obt-icon-btn obt-icon-btn--danger" onClick={() => handleDeletePair(pair.id)}>🗑️</button></td>}</tr>))}</tbody></table></div></div>
            )}
          </>
        )}

        {activeTab === 'target' && (
          <>
            <form onSubmit={handleTargetSubmit} className="obt-panel">
              <h2 style={{ marginBottom: 18 }}>Colori target</h2>
              <div className="obt-row">
                {[{ label: 'Occhi', key: 'target_eyes' },{ label: 'Body 01', key: 'target_body1' },{ label: 'Body 02', key: 'target_body2' },{ label: 'Extra 01', key: 'target_extra1' },{ label: 'Extra 02', key: 'target_extra2' }].map(({ label, key }) => (
                  <div className="obt-field" key={key}><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{label}<ColorCell hex={targetForm[key]} /></label><input className="obt-input" disabled={!isOwner} value={targetForm[key]} onChange={e => setTargetForm({ ...targetForm, [key]: e.target.value })} placeholder="es. A0A0A0" /></div>
                ))}
              </div>
              {isOwner && <button type="submit" className="obt-btn obt-btn--primary">Salva target</button>}
            </form>
            <div className="obt-panel"><h3 style={{ marginBottom: 14 }}>Mutazioni target</h3><MutationSelector speciesId={project.species_id} selectedIds={targetMutationIds} onChange={setTargetMutationIds} />{isOwner && <button className="obt-btn obt-btn--primary obt-mt-md" onClick={handleTargetSubmit}>Salva mutazioni target</button>}</div>
          </>
        )}
      </div>

      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Modifica progetto">
        <form onSubmit={handleEditProjectSubmit}>
          <div className="obt-field"><label>Nome</label><input className="obt-input" value={editProjectForm.name} onChange={e => setEditProjectForm({...editProjectForm, name: e.target.value})} required /></div>
          <div className="obt-field"><label>Specie</label><select className="obt-select" value={editProjectForm.species_id} onChange={e => setEditProjectForm({...editProjectForm, species_id: e.target.value})} required>{speciesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="obt-row"><div className="obt-field"><label>Autore</label><input className="obt-input" value={editProjectForm.author} onChange={e => setEditProjectForm({...editProjectForm, author: e.target.value})} /></div><div className="obt-field"><label>Collaboratori</label><input className="obt-input" value={editProjectForm.collaborators} onChange={e => setEditProjectForm({...editProjectForm, collaborators: e.target.value})} /></div></div>
          <div className="obt-field"><label>Note</label><textarea className="obt-textarea" value={editProjectForm.project_notes} onChange={e => setEditProjectForm({...editProjectForm, project_notes: e.target.value})} /></div>
          <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">Salva</button><button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowEditProject(false)}>Annulla</button></div>
        </form>
      </Modal>
    </>
  )
}

export default ProjectPage