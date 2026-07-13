import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import { useT } from '../i18n'

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

  useEffect(() => { checkUserAndLoadProjects() }, [])

  const checkUserAndLoadProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile) {
      setUsername(profile.username)
      setNewProject(prev => ({ ...prev, author: profile.username }))
    }
    const { data: speciesData } = await supabase.from('species').select('*').order('name', { ascending: true })
    setSpecies(speciesData || [])
    if (speciesData && speciesData.length > 0) setNewProject(prev => ({ ...prev, species_id: speciesData[0].id }))
    const { data: projectsData } = await supabase.from('projects').select('*, species(name)').eq('owner_id', user.id).order('created_at', { ascending: false })
    if (projectsData) setProjects(projectsData)
    setLoading(false)
  }

  const closeNewProjectModal = () => {
    setShowNewProject(false)
    setNewProject({ name: '', species_id: species[0]?.id || '', author: username, collaborators: '', project_notes: '' })
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('projects').insert({
      owner_id: user.id, name: newProject.name, species_id: newProject.species_id,
      author: newProject.author || null, collaborators: newProject.collaborators || null, project_notes: newProject.project_notes || null,
    }).select('*, species(name)').single()
    if (!error && data) { setProjects([data, ...projects]); closeNewProjectModal() }
  }

  const cardVariant = (i) => ['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]
  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  return (
    <>
      <div className="obt-hero">
        <h1>{t('dashboard.title')}</h1>
        <div className="obt-hero-sub">{projects.length === 0 ? t('dashboard.empty') : t('dashboard.count', { count: projects.length })}</div>
      </div>
      <div className="obt-page">
        <div className="obt-section-head"><div /><button className="obt-btn obt-btn--primary" onClick={() => setShowNewProject(true)}>{t('dashboard.newProject')}</button></div>
        <Modal open={showNewProject} onClose={closeNewProjectModal} title={t('dashboard.newProjectTitle')}>
          <form onSubmit={handleCreateProject}>
            <div className="obt-hint">{t('dashboard.hint')}</div>
            <div className="obt-row">
              <div className="obt-field"><label>{t('dashboard.name')} *</label><input className="obt-input" type="text" placeholder={t('dashboard.namePlaceholder')} value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} required autoFocus /></div>
              <div className="obt-field"><label>{t('dashboard.species')} *</label><select className="obt-select" value={newProject.species_id} onChange={e => setNewProject({ ...newProject, species_id: e.target.value })} required>{species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            <div className="obt-row">
              <div className="obt-field"><label>{t('dashboard.author')} *</label><input className="obt-input" type="text" value={newProject.author} onChange={e => setNewProject({ ...newProject, author: e.target.value })} required /></div>
              <div className="obt-field"><label>{t('dashboard.collaborators')} <span className="obt-optional">{t('common.optional')}</span></label><input className="obt-input" type="text" value={newProject.collaborators} onChange={e => setNewProject({ ...newProject, collaborators: e.target.value })} /></div>
            </div>
            <div className="obt-field"><label>{t('dashboard.notes')} <span className="obt-optional">{t('common.optional')}</span></label><textarea className="obt-textarea" value={newProject.project_notes} onChange={e => setNewProject({ ...newProject, project_notes: e.target.value })} /></div>
            <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">{t('dashboard.create')}</button><button type="button" className="obt-btn obt-btn--ghost" onClick={closeNewProjectModal}>{t('common.cancel')}</button></div>
          </form>
        </Modal>
        {projects.length === 0 ? (
          <div className="obt-panel obt-empty"><div className="obt-empty-icon">🥚</div><h3>{t('dashboard.emptyTitle')}</h3><p>{t('dashboard.emptyText')}</p><button className="obt-btn obt-btn--primary" onClick={() => setShowNewProject(true)}>{t('dashboard.newProject')}</button></div>
        ) : (
          <div className="obt-grid">{projects.map((p, i) => (<div key={p.id} onClick={() => navigate(`/project/${p.id}`)} className={`obt-card ${cardVariant(i)}`}><span className="obt-badge">{p.species?.name || '—'}</span><h3>{p.name}</h3><div className="obt-meta">👤 {p.author || t('dashboard.authorUnset')}</div></div>))}</div>
        )}
      </div>
    </>
  )
}
export default Dashboard
