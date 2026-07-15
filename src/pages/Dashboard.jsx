import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import NewLineModal from './NewLineModal'
import { useT } from '../i18n'

function Dashboard() {
  const { t } = useT()
  const [containers, setContainers] = useState([])
  const [looseLines, setLooseLines] = useState([])
  const [lineCounts, setLineCounts] = useState({})
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [showNewContainer, setShowNewContainer] = useState(false)
  const [showNewLine, setShowNewLine] = useState(false)
  const [containerForm, setContainerForm] = useState({ name: '', notes: '' })
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile) setUsername(profile.username)
    const { data: speciesData } = await supabase.from('species').select('*').order('name', { ascending: true })
    setSpecies(speciesData || [])
    const { data: containersData } = await supabase.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setContainers(containersData || [])
    const { data: linesData } = await supabase.from('lines').select('*, species(name)').eq('owner_id', user.id).order('created_at', { ascending: false })
    const all = linesData || []
    setLooseLines(all.filter(l => !l.project_id))
    const counts = {}
    all.forEach(l => { if (l.project_id) counts[l.project_id] = (counts[l.project_id] || 0) + 1 })
    setLineCounts(counts)
    setLoading(false)
  }

  const createContainer = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('projects').insert({
      owner_id: user.id, name: containerForm.name, notes: containerForm.notes || null,
    }).select('*').single()
    if (!error && data) {
      setContainers([data, ...containers])
      setShowNewContainer(false)
      setContainerForm({ name: '', notes: '' })
    }
  }

  const onLineCreated = (line) => setLooseLines([line, ...looseLines])

  const cardVariant = (i) => ['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]
  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  const nothing = containers.length === 0 && looseLines.length === 0

  return (
    <>
      <div className="obt-hero">
        <h1>{t('dashboard.title')}</h1>
        <div className="obt-hero-sub">{nothing ? t('dashboard.empty') : t('dashboard.count', { count: containers.length + looseLines.length })}</div>
      </div>
      <div className="obt-page">
        <div className="obt-section-head">
          <div />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="obt-btn obt-btn--ghost" onClick={() => setShowNewContainer(true)}>{t('dashboard.newContainer')}</button>
            <button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('dashboard.newLine')}</button>
          </div>
        </div>

        <Modal open={showNewContainer} onClose={() => setShowNewContainer(false)} title={t('dashboard.newContainerTitle')}>
          <form onSubmit={createContainer}>
            <div className="obt-hint">{t('dashboard.containerHint')}</div>
            <div className="obt-field"><label>{t('dashboard.containerName')} *</label><input className="obt-input" type="text" placeholder={t('dashboard.containerNamePlaceholder')} value={containerForm.name} onChange={e => setContainerForm({ ...containerForm, name: e.target.value })} required autoFocus /></div>
            <div className="obt-field"><label>{t('dashboard.notes')} <span className="obt-optional">{t('common.optional')}</span></label><textarea className="obt-textarea" value={containerForm.notes} onChange={e => setContainerForm({ ...containerForm, notes: e.target.value })} /></div>
            <div className="obt-actions"><button type="submit" className="obt-btn obt-btn--primary">{t('dashboard.createContainer')}</button><button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowNewContainer(false)}>{t('common.cancel')}</button></div>
          </form>
        </Modal>

        <NewLineModal open={showNewLine} onClose={() => setShowNewLine(false)} onCreated={onLineCreated} species={species} defaultAuthor={username} projectId={null} />

        {nothing ? (
          <div className="obt-panel obt-empty"><div className="obt-empty-icon">🥚</div><h3>{t('dashboard.emptyTitle')}</h3><p>{t('dashboard.emptyText')}</p></div>
        ) : (
          <>
            {containers.length > 0 && (
              <>
                <h2 style={{ margin: '8px 0 14px', fontSize: 18 }}>{t('dashboard.projectsTitle')}</h2>
                <div className="obt-grid">
                  {containers.map((c, i) => (
                    <div key={c.id} onClick={() => navigate(`/project/${c.id}`)} className={`obt-card ${cardVariant(i)}`}>
                      <span className="obt-badge"><i className="ti ti-folder" /> {t('dashboard.container')}</span>
                      <h3>{c.name}</h3>
                      <div className="obt-meta">{t('dashboard.lineCount', { count: lineCounts[c.id] || 0 })}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {looseLines.length > 0 && (
              <>
                <h2 style={{ margin: '22px 0 14px', fontSize: 18 }}>{t('dashboard.linesTitle')}</h2>
                <div className="obt-grid">
                  {looseLines.map((l, i) => (
                    <div key={l.id} onClick={() => navigate(`/line/${l.id}`)} className={`obt-card ${cardVariant(i)}`}>
                      <span className="obt-badge">{l.species?.name || '—'}</span>
                      <h3>{l.name}</h3>
                      <div className="obt-meta">👤 {l.author || t('dashboard.authorUnset')}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
export default Dashboard
