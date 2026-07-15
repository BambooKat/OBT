import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import NewLineModal from './NewLineModal'
import { useT } from '../i18n'

function ProjectDashboard() {
  const { t } = useT()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [container, setContainer] = useState(null)
  const [lines, setLines] = useState([])
  const [species, setSpecies] = useState([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showNewLine, setShowNewLine] = useState(false)

  useEffect(() => { load() }, [projectId])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile) setUsername(profile.username)
    const { data: speciesData } = await supabase.from('species').select('*').order('name', { ascending: true })
    setSpecies(speciesData || [])
    const { data: cont } = await supabase.from('projects').select('*').eq('id', projectId).single()
    if (!cont) { setNotFound(true); setLoading(false); return }
    setContainer(cont)
    const { data: linesData } = await supabase.from('lines').select('*, species(name)').eq('project_id', projectId).order('created_at', { ascending: false })
    setLines(linesData || [])
    setLoading(false)
  }

  const onLineCreated = (line) => setLines([line, ...lines])

  const deleteContainer = async () => {
    if (!window.confirm(t('projectDash.deleteConfirm'))) return
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (!error) navigate('/dashboard')
  }

  const cardVariant = (i) => ['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (notFound) return (
    <div className="obt-page">
      <div className="obt-panel obt-empty"><h3>{t('projectDash.notFound')}</h3><button className="obt-btn obt-btn--primary" onClick={() => navigate('/dashboard')}>&larr; {t('projectDash.back')}</button></div>
    </div>
  )

  return (
    <>
      <div className="obt-hero">
        <h1>{container.name}</h1>
        <div className="obt-hero-sub">{t('projectDash.count', { count: lines.length })}</div>
      </div>
      <div className="obt-page">
        <div className="obt-section-head">
          <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/dashboard')}>&larr; {t('projectDash.back')}</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={deleteContainer}>{t('projectDash.deleteContainer')}</button>
            <button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('projectDash.newLine')}</button>
          </div>
        </div>

        <NewLineModal open={showNewLine} onClose={() => setShowNewLine(false)} onCreated={onLineCreated} species={species} defaultAuthor={username} projectId={projectId} />

        {lines.length === 0 ? (
          <div className="obt-panel obt-empty"><div className="obt-empty-icon">🥚</div><h3>{t('projectDash.empty')}</h3><p>{t('projectDash.emptyText')}</p><button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('projectDash.newLine')}</button></div>
        ) : (
          <div className="obt-grid">
            {lines.map((l, i) => (
              <div key={l.id} onClick={() => navigate(`/line/${l.id}`)} className={`obt-card ${cardVariant(i)}`}>
                <span className="obt-badge">{l.species?.name || '—'}</span>
                <h3>{l.name}</h3>
                <div className="obt-meta">👤 {l.author || t('dashboard.authorUnset')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
export default ProjectDashboard
