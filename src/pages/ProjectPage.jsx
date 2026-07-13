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

  const handlePetSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      project_id: id, code: petForm.code, sex: petForm.sex,
      letter: petForm.letter || null, generation: parseInt(petForm.generation) || 0,
      mother_id: petForm.mother_id || null, father_id: petForm.father_id || null,
      eyes: petForm.eyes || null, body1: petForm.body1 || null, body2: petForm.body2 || null,
      extra1: petForm.extra1 || null, extra2: petForm.extra2 || null, notes: petForm.notes || null,
    }
    let petId = editingPetId
    if (editingPetId) {
      await supabase.from('pets').update(payload).eq('id', editingPetId)
      await supabase.from('pet_mutations').delete().eq('pet_id', editingPetId)
    } else {
      const { data: newPet } = await supabase.from('pets').insert(payload).select().single()
      petId = newPet?.id
    }
    if (petId && selectedMutationIds.length > 0) {
      const rows = selectedMutationIds.map(mutationId => ({ pet_id: petId, mutation_id: mutationId }))
      await supabase.from('pet_mutations').insert(rows)
    }
    resetPetForm()
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
    await supabase.from('pets').delete().eq('id', petId)
    loadAll()
  }

  const handleTargetSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    await supabase.from('projects').update(targetForm).eq('id', id)
    await supabase.from('project_mutations').delete().eq('project_id', id)
    if (targetMutationIds.length > 0) {
      const rows = targetMutationIds.map(mutationId => ({ project_id: id, mutation_id: mutationId }))
      await supabase.from('project_mutations').insert(rows)
    }
    loadAll()
  }

  const closePairForm = () => {
    setShowPairForm(false)
    setPairForm({ mother_id: '', father_id: '', pair_date: '', outcome_notes: '' })
  }

  const handlePairSubmit = async (e) => {
    e.preventDefault()
    await supabase.from('pairs').insert({
      project_id: id, mother_id: pairForm.mother_id, father_id: pairForm.father_id,
      pair_date: pairForm.pair_date || null, outcome_notes: pairForm.outcome_notes || null,
    })
    closePairForm()
    loadAll()
  }

  const handleDeletePair = async (pairId) => {
    await supabase.from('pairs').delete().eq('id', pairId)
    loadAll()
  }

  const handleEditProjectSubmit = async (e) => {
    e.preventDefault()
    await supabase.from('projects').update({
      name: editProjectForm.name,
      species_id: editProjectForm.species_id,
      author: editProjectForm.author || null,
      collaborators: editProjectForm.collaborators || null,
      project_notes: editProjectForm.project_notes || null,
    }).eq('id', id)
    setShowEditProject(false)
    loadAll()
  }

  const handleDeleteProject = async () => {
    const confirmed = window.confirm(`Eliminare definitivamente "${project.name}"?\n\nVerranno cancellati anche tutti gli esemplari, le coppie e i dati collegati. Questa azione non può essere annullata.`)
    if (!confirmed) return
    await supabase.from('projects').delete().eq('id', id)
    navigate('/dashboard')
  }

  if (loading) return <div className="obt-loading">Caricamento...</div>
  if (!project) return null

  const starters = pets.filter(p => p.generation === 0)
  const children = pets.filter(p => p.generation > 0)
  const males = pets.filter(p => p.sex === 'M')
  const females = pets.filter(p => p.sex === 'F')

  const PetTable = ({ list, title }) => (
    <div className="obt-panel">
      <h3 style={{ marginBottom: 14 }}>{title}</h3>
      {list.length === 0 ? (
        <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>Nessuno.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="obt-table">
            <thead>
              <tr>
                <th>Codice</th><th>Sesso</th><th>Lettera</th><th>Gen</th>
                <th>Occhi</th><th>Body1</th><th>Body2</th><th>Extra1</th><th>Extra2</th>
                <th>Muta</th><th>Distanza</th><th>Note</th>{isOwner && <th></th>}
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
                        <button className="obt-icon-btn" onClick={() => handleEditPet(pet)} title="Modifica"><i className="ti ti-pencil" /></button>
                        <button className="obt-icon-btn obt-icon-btn--danger" onClick={() => handleDeletePet(pet.id)} title="Elimina"><i className="ti ti-trash" /></button>
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

  const tabLabels = { starters: 'Starter (Gen 0)', children: 'Figli', pairs: 'Coppie', target: 'Target' }

  // FIX: Niente <Layout> qui! Il Layout è già in App.jsx, altrimenti raddoppia header/footer
  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/dashboard')}>&larr; Dashboard</button>
            {isOwner && <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setShowEditProject(true)}>✎ Edit Project</button>}
          </div>
          <div className="obt-hero-title">
            <h1>{project.name}</h1>
            {project.project_notes ? <p className="obt-hero-desc">{project.project_notes}</p> : isOwner ? <p className="obt-hero-desc obt-hero-desc--empty">Nessuna info progetto ancora — aggiungila da "Edit Project".</p> : null}
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">Specie</span> {project.species?.name}</div>
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">Autore</span> {project.author || '-'}</div>
            {project.collaborators && <div className="obt-hero-info-row"><span className="obt-hero-info-label">Collaboratori</span> {project.collaborators}</div>}
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">Creato il</span> {new Date(project.created_at).toLocaleDateString('it-IT')}</div>
          </div>
        </div>
        <div className="obt-tabs">
          {['starters', 'children', 'pairs', 'target'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`obt-tab${activeTab === tab ? ' obt-tab--active' : ''}`}>{tabLabels[tab]}</button>
          ))}
        </div>
      </div>

      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Modifica progetto">
        <form onSubmit={handleEditProjectSubmit}>
          <div className="obt-row">
            <div className="obt-field"><label>Nome progetto *</label><input className="obt-input" type="text" value={editProjectForm.name} onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })} required autoFocus /></div>
            <div className="obt-field"><label>Specie *</label><select className="obt-select" value={editProjectForm.species_id} onChange={(e) => setEditProjectForm({ ...editProjectForm, species_id: e.target.value })} required>{speciesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <div className="obt-row">
            <div className="obt-field"><label>Autore</label><input className="obt-input" type="text" value={editProjectForm.author} onChange={(e) => setEditProjectForm({ ...editProjectForm, author: e.target.value })} /></div>
            <div className="obt-field"><label>Collaboratori <span className="obt-optional">(opzionale)</span></label><input className="obt-input" type="text" value={editProjectForm.collaborators} onChange={(e) => setEditProjectForm({ ...editProjectForm, collaborators: e.target.value })} /></div>
          </div>
          <div className="obt-field"><label>Info progetto <span className="obt-optional">(opzionale)</span></label><textarea className="obt-textarea" value={editProjectForm.project_notes} onChange={(e) => setEditProjectForm({ ...editProjectForm, project_notes: e.target.value })} /></div>
          <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">Salva modifiche</button><button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowEditProject(false)}>Annulla</button></div>
        </form>
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <p className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Zona pericolosa</p>
          <button type="button" className="obt-btn obt-btn--danger obt-btn--sm" onClick={handleDeleteProject}>🗑 Elimina progetto</button>
        </div>
      </Modal>

      <div className="obt-page">
        {(activeTab === 'starters' || activeTab === 'children') && (
          <>
            <div className="obt-section-head"><div />{isOwner && <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={openNewPetForm}>+ Aggiungi {activeTab === 'starters' ? 'starter' : 'figlio'}</button>}</div>
            <Modal open={showPetForm} onClose={resetPetForm} title={editingPetId ? 'Modifica esemplare' : `Nuovo ${activeTab === 'starters' ? 'starter' : 'figlio'}`} size="lg">
              <form onSubmit={handlePetSubmit}>
                <div className="obt-row">
                  <div className="obt-field"><label>Codice</label><input className="obt-input" value={petForm.code} onChange={e => setPetForm({...petForm, code: e.target.value})} required autoFocus /></div>
                  <div className="obt-field"><label>Sesso</label><select className="obt-select" value={petForm.sex} onChange={e => setPetForm({...petForm, sex: e.target.value})}><option value="M">M</option><option value="F">F</option><option value="ND">ND</option></select></div>
                  <div className="obt-field"><label>Lettera</label><input className="obt-input" maxLength={1} value={petForm.letter} onChange={e => setPetForm({...petForm, letter: e.target.value})} /></div>
                  <div className="obt-field"><label>Generazione</label><input type="number" min="0" className="obt-input" value={petForm.generation} onChange={e => setPetForm({...petForm, generation: e.target.value})} /></div>
                </div>
                {petForm.generation > 0 && (
                  <div className="obt-row">
                    <div className="obt-field"><label>Madre</label><select className="obt-select" value={petForm.mother_id} onChange={e => setPetForm({...petForm, mother_id: e.target.value})}><option value="">-- nessuna --</option>{females.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}</select></div>
                    <div className="obt-field"><label>Padre</label><select className="obt-select" value={petForm.father_id} onChange={e => setPetForm({...petForm, father_id: e.target.value})}><option value="">-- nessuno --</option>{males.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}</select></div>
                  </div>
                )}
                <div className="obt-row">
                  <div className="obt-field"><label>Occhi</label><input className="obt-input" placeholder="6A786D" value={petForm.eyes} onChange={e => setPetForm({...petForm, eyes: e.target.value})} /></div>
                  <div className="obt-field"><label>Body 01</label><input className="obt-input" placeholder="22565B" value={petForm.body1} onChange={e => setPetForm({...petForm, body1: e.target.value})} /></div>
                  <div className="obt-field"><label>Body 02</label><input className="obt-input" placeholder="181B23" value={petForm.body2} onChange={e => setPetForm({...petForm, body2: e.target.value})} /></div>
                  <div className="obt-field"><label>Extra 01</label><input className="obt-input" placeholder="4D565C" value={petForm.extra1} onChange={e => setPetForm({...petForm, extra1: e.target.value})} /></div>
                  <div className="obt-field"><label>Extra 02</label><input className="obt-input" placeholder="8CABAE" value={petForm.extra2} onChange={e => setPetForm({...petForm, extra2: e.target.value})} /></div>
                </div>
                <div className="obt-field"><label>Note</label><input className="obt-input" value={petForm.notes} onChange={e => setPetForm({...petForm, notes: e.target.value})} /></div>
                <div className="obt-field"><label>Mutazioni</label><MutationSelector speciesId={project.species_id} selectedIds={selectedMutationIds} onChange={setSelectedMutationIds} /></div>
                <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">{editingPetId ? 'Salva modifiche' : 'Aggiungi'}</button><button type="button" className="obt-btn obt-btn--ghost" onClick={resetPetForm}>Annulla</button></div>
              </form>
            </Modal>
            {activeTab === 'starters' ? (<><PetTable list={starters.filter(p => p.sex === 'F')} title="Femmine" /><PetTable list={starters.filter(p => p.sex === 'M')} title="Maschi" /><PetTable list={starters.filter(p => p.sex === 'ND')} title="Non ancora sessati" /></>) : (<><PetTable list={children.filter(p => p.sex === 'F')} title="Femmine" /><PetTable list={children.filter(p => p.sex === 'M')} title="Maschi" /><PetTable list={children.filter(p => p.sex === 'ND')} title="Non ancora sessati" /></>)}
          </>
        )}
        {activeTab === 'pairs' && (<><div className="obt-section-head"><div />{isOwner && <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={() => setShowPairForm(true)}>+ Registra coppia</button>}</div><Modal open={showPairForm} onClose={closePairForm} title="Registra coppia"><form onSubmit={handlePairSubmit}><div className="obt-row"><div className="obt-field"><label>Madre</label><select className="obt-select" value={pairForm.mother_id} onChange={e => setPairForm({...pairForm, mother_id: e.target.value})} required autoFocus><option value="">-- seleziona --</option>{females.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}</select></div><div className="obt-field"><label>Padre</label><select className="obt-select" value={pairForm.father_id} onChange={e => setPairForm({...pairForm, father_id: e.target.value})} required><option value="">-- seleziona --</option>{males.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}</select></div><div className="obt-field"><label>Data</label><input type="date" className="obt-input" value={pairForm.pair_date} onChange={e => setPairForm({...pairForm, pair_date: e.target.value})} /></div></div><div className="obt-field"><label>Note / esito</label><input className="obt-input" value={pairForm.outcome_notes} onChange={e => setPairForm({...pairForm, outcome_notes: e.target.value})} /></div><div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">Registra</button><button type="button" className="obt-btn obt-btn--ghost" onClick={closePairForm}>Annulla</button></div></form></Modal>{pairs.length === 0 ? <div className="obt-panel obt-empty"><div className="obt-empty-icon">🥚</div><h3>Nessuna coppia ancora registrata</h3><p>Registra il primo accoppiamento per iniziare a tracciare la genealogia.</p></div> : <div className="obt-panel"><div style={{ overflowX: 'auto' }}><table className="obt-table"><thead><tr><th>Madre</th><th>Padre</th><th>Data</th><th>Note</th>{isOwner && <th></th>}</tr></thead><tbody>{pairs.map(pair => (<tr key={pair.id}><td>{pair.mother?.code || '-'}</td><td>{pair.father?.code || '-'}</td><td>{pair.pair_date || '-'}</td><td>{pair.outcome_notes || ''}</td>{isOwner && <td><button className="obt-icon-btn obt-icon-btn--danger" onClick={() => handleDeletePair(pair.id)} title="Elimina"><i className="ti ti-trash" /></button></td>}</tr>))}</tbody></table></div></div>}</>)}
        {activeTab === 'target' && (<><form onSubmit={handleTargetSubmit} className="obt-panel"><h2 style={{ marginBottom: 18 }}>Colori target</h2><div className="obt-row">{[{ label: 'Occhi', key: 'target_eyes' },{ label: 'Body 01', key: 'target_body1' },{ label: 'Body 02', key: 'target_body2' },{ label: 'Extra 01', key: 'target_extra1' },{ label: 'Extra 02', key: 'target_extra2' },].map(({ label, key }) => (<div className="obt-field" key={key}><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{label}<ColorCell hex={targetForm[key]} /></label><input className="obt-input" disabled={!isOwner} value={targetForm[key]} onChange={e => setTargetForm({ ...targetForm, [key]: e.target.value })} placeholder="es. A0A0A0" /></div>))}</div>{isOwner && <button type="submit" className="obt-btn obt-btn--primary">Salva target</button>}</form><div className="obt-panel"><h3 style={{ marginBottom: 14 }}>Mutazioni target</h3><MutationSelector speciesId={project.species_id} selectedIds={targetMutationIds} onChange={setTargetMutationIds} />{isOwner && <button className="obt-btn obt-btn--primary obt-mt-md" onClick={handleTargetSubmit}>Salva mutazioni target</button>}</div></>)}
      </div>
    </>
  )
}
export default ProjectPage
