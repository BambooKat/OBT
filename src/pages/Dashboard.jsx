import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
// RIMUOVI questa riga: import Layout from './Layout'

function Dashboard() {
  const [projects, setProjects] = useState([])
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)

  const [newProject, setNewProject] = useState({
    name: '', species_id: '', author: '', collaborators: '', project_notes: ''
  })

  const navigate = useNavigate()

  useEffect(() => {
    checkUserAndLoadProjects()
  }, [])

  const checkUserAndLoadProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    const { data: profile } = await supabase
     .from('profiles')
     .select('username')
     .eq('id', user.id)
     .single()

    if (profile) {
      setUsername(profile.username)
      setNewProject(prev => ({...prev, author: profile.username }))
    }

    const { data: speciesData } = await supabase
     .from('species')
     .select('*')
     .order('name', { ascending: true })

    setSpecies(speciesData || [])
    if (speciesData && speciesData.length > 0) {
      setNewProject(prev => ({...prev, species_id: speciesData[0].id }))
    }

    const { data: projectsData, error } = await supabase
     .from('projects')
     .select('*, species(name)')
     .eq('owner_id', user.id)
     .order('created_at', { ascending: false })

    if (!error && projectsData) {
      setProjects(projectsData)
    }

    setLoading(false)
  }

  const closeNewProjectModal = () => {
    setShowNewProject(false)
    setNewProject({ name: '', species_id: species[0]?.id || '', author: username, collaborators: '', project_notes: '' })
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
     .from('projects')
     .insert({
        owner_id: user.id,
        name: newProject.name,
        species_id: newProject.species_id,
        author: newProject.author || null,
        collaborators: newProject.collaborators || null,
        project_notes: newProject.project_notes || null,
      })
     .select('*, species(name)')
     .single()

    if (!error && data) {
      setProjects([data,...projects])
      closeNewProjectModal()
    }
  }

  const cardVariant = (index) => {
    const variants = ['', 'obt-card--secondary', 'obt-card--tertiary']
    return variants[index % variants.length]
  }

  if (loading) {
    return <div className="obt-loading">Caricamento...</div> // <-- Niente Layout qui
  }

  // RIMOSSO <Layout> wrapper
  return (
    <>
      <div className="obt-hero">
        <h1>I tuoi progetti</h1>
        <div className="obt-hero-sub">
          {projects.length === 0? 'Nessun progetto ancora' : `${projects.length} progett${projects.length === 1? 'o' : 'i'}`}
        </div>
      </div>

      <div className="obt-page">
        <div className="obt-section-head">
          <div />
          <button className="obt-btn obt-btn--primary" onClick={() => setShowNewProject(true)}>
            + Nuovo progetto
          </button>
        </div>

        <Modal open={showNewProject} onClose={closeNewProjectModal} title="Nuovo progetto">
          <form onSubmit={handleCreateProject}>
            <div className="obt-hint">Configura le basi, potrai modificarle in seguito.</div>

            <div className="obt-row">
              <div className="obt-field">
                <label>Nome progetto *</label>
                <input
                  className="obt-input"
                  type="text"
                  placeholder="es. Hanamiya"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="obt-field">
                <label>Specie *</label>
                <select
                  className="obt-select"
                  value={newProject.species_id}
                  onChange={(e) => setNewProject({...newProject, species_id: e.target.value })}
                  required
                >
                  {species.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="obt-row">
              <div className="obt-field">
                <label>Autore *</label>
                <input
                  className="obt-input"
                  type="text"
                  placeholder="Nome di chi cura il progetto"
                  value={newProject.author}
                  onChange={(e) => setNewProject({...newProject, author: e.target.value })}
                  required
                />
              </div>

              <div className="obt-field">
                <label>Collaboratori <span className="obt-optional">(opzionale)</span></label>
                <input
                  className="obt-input"
                  type="text"
                  placeholder="es. Mario, Luigi"
                  value={newProject.collaborators}
                  onChange={(e) => setNewProject({...newProject, collaborators: e.target.value })}
                />
              </div>
            </div>

            <div className="obt-field">
              <label>Note <span className="obt-optional">(opzionale)</span></label>
              <textarea
                className="obt-textarea"
                placeholder="Note libere sul progetto..."
                value={newProject.project_notes}
                onChange={(e) => setNewProject({...newProject, project_notes: e.target.value })}
              />
            </div>

            <div className="obt-actions">
              <button type="submit" className="obt-btn obt-btn--primary">Crea progetto</button>
              <button type="button" className="obt-btn obt-btn--ghost" onClick={closeNewProjectModal}>Annulla</button>
            </div>
          </form>
        </Modal>

        {projects.length === 0? (
          <div className="obt-panel obt-empty">
            <div className="obt-empty-icon">ðŸ¥š</div>
            <h3>Nessun progetto ancora</h3>
            <p>Creane uno per iniziare a tracciare il tuo breeding.</p>
            <button className="obt-btn obt-btn--primary" onClick={() => setShowNewProject(true)}>+ Nuovo progetto</button>
          </div>
        ) : (
          <div className="obt-grid">
            {projects.map((project, i) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className={`obt-card ${cardVariant(i)}`}
              >
                <span className="obt-badge">{project.species?.name || 'â€”'}</span>
                <h3>{project.name}</h3>
                <div className="obt-meta">ðŸ‘¤ {project.author || 'Autore non impostato'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Dashboard