import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import NewLineModal from './NewLineModal'
import { useT } from '../i18n'

function ProjectDashboard() {
  const { t } = useT()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [container, setContainer] = useState(null)
  const [lines, setLines] = useState([])
  const [looseLines, setLooseLines] = useState([])
  const [species, setSpecies] = useState([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showNewLine, setShowNewLine] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [manageChecked, setManageChecked] = useState([])

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
    const { data: allLines } = await supabase.from('lines').select('*, species(name)').eq('owner_id', user.id).order('created_at', { ascending: false })
    const all = allLines || []
    setLines(all.filter(l => l.project_id === projectId))
    setLooseLines(all.filter(l => !l.project_id))
    setLoading(false)
  }

  const onLineCreated = (line) => setLines([line, ...lines])

  const openManage = () => {
    setManageChecked(lines.map(l => l.id))
    setShowManage(true)
  }
  const toggleManage = (id) => {
    setManageChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const saveManage = async () => {
    const candidates = [...lines, ...looseLines]
    const desired = new Set(manageChecked)
    const updates = []
    candidates.forEach(l => {
      const shouldBeIn = desired.has(l.id)
      const isIn = l.project_id === projectId
      if (shouldBeIn && !isIn) updates.push({ id: l.id, project_id: projectId })
      else if (!shouldBeIn && isIn) updates.push({ id: l.id, project_id: null })
    })
    for (const u of updates) {
      await supabase.from('lines').update({ project_id: u.project_id }).eq('id', u.id)
    }
    setShowManage(false)
    load()
  }

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

  const manageCandidates = [...lines, ...looseLines]

  return (
    <>
      <div className="obt-hero">
        <h1>{container.name}</h1>
        <div className="obt-hero-sub">{t('projectDash.count', { count: lines.length })}</div>
      </div>
      <div className="obt-page">
        <div className="obt-section-head">
          <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/dashboard')}>&larr; {t('projectDash.back')}</button>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openManage}>{t('projectDash.manage')}</button>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={deleteContainer}>{t('projectDash.deleteContainer')}</button>
            <button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('projectDash.newLine')}</button>
          </div>
        </div>

        <NewLineModal open={showNewLine} onClose={() => setShowNewLine(false)} onCreated={onLineCreated} species={species} defaultAuthor={username} projectId={projectId} />

        <Modal open={showManage} onClose={() => setShowManage(false)} title={t('projectDash.manageTitle')} size="lg">
          <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>{t('projectDash.manageHint')}</p>
          {manageCandidates.length === 0 ? (
            <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>{t('projectDash.manageEmpty')}</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {manageCandidates.map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', fontWeight: 500, borderBottom: '0.5px solid var(--line)' }}>
                  <input type="checkbox" checked={manageChecked.includes(l.id)} onChange={() => toggleManage(l.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <span style={{ flex: 1 }}>{l.name}</span>
                  <span className="obt-text-soft" style={{ fontSize: 12 }}>{l.species?.name || '—'}</span>
                </label>
              ))}
            </div>
          )}
          <div className="obt-actions" style={{ marginTop: 14 }}>
            <button type="button" className="obt-btn obt-btn--primary" onClick={saveManage}>{t('common.saveChanges')}</button>
            <button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowManage(false)}>{t('common.cancel')}</button>
          </div>
        </Modal>

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
