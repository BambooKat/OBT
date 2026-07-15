import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import NewLineModal from './NewLineModal'
import { useT } from '../i18n'

function ProjectDashboard() {
  const { t, formatDate } = useT()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [container, setContainer] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [lines, setLines] = useState([])
  const [looseLines, setLooseLines] = useState([])
  const [species, setSpecies] = useState([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showNewLine, setShowNewLine] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [manageChecked, setManageChecked] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', notes: '', is_public: false })
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/project/${projectId}`

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
    const owner = user.id === cont.owner_id
    setIsOwner(owner)
    setEditForm({ name: cont.name, notes: cont.notes || '', is_public: cont.is_public === true })
    const { data: linesData } = await supabase.from('lines').select('*, species(name)').eq('project_id', projectId).order('created_at', { ascending: false })
    setLines(linesData || [])
    if (owner) {
      const { data: loose } = await supabase.from('lines').select('*, species(name)').eq('owner_id', user.id).is('project_id', null).order('created_at', { ascending: false })
      setLooseLines(loose || [])
    }
    setLoading(false)
  }

  const onLineCreated = (line) => setLines([line, ...lines])

  const openManage = () => { setManageChecked(lines.map(l => l.id)); setShowManage(true) }
  const toggleManage = (id) => setManageChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const saveManage = async () => {
    const candidates = [...lines, ...looseLines]
    const desired = new Set(manageChecked)
    for (const l of candidates) {
      const shouldBeIn = desired.has(l.id)
      const isIn = l.project_id === projectId
      if (shouldBeIn && !isIn) await supabase.from('lines').update({ project_id: projectId }).eq('id', l.id)
      else if (!shouldBeIn && isIn) await supabase.from('lines').update({ project_id: null }).eq('id', l.id)
    }
    setShowManage(false)
    load()
  }

  const saveEdit = async () => {
    const { error } = await supabase.from('projects').update({
      name: editForm.name, notes: editForm.notes || null, is_public: editForm.is_public,
    }).eq('id', projectId)
    if (error) return
    setShowEdit(false)
    load()
  }

  const toggleVisibility = async () => {
    const next = !container.is_public
    if (!next && !window.confirm(t('projectDash.confirmPrivate'))) return
    const { error } = await supabase.from('projects').update({ is_public: next }).eq('id', projectId)
    if (!error) load()
  }

  const copyLink = async () => {
    if (!editForm.is_public) return
    try { await navigator.clipboard.writeText(shareUrl) }
    catch { window.prompt(t('projectDash.copyPrompt'), shareUrl); return }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
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
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => navigate('/dashboard')}>&larr; {t('projectDash.back')}</button>
            {isOwner && <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setShowEdit(true)}>✎ {t('projectDash.edit')}</button>}
            {isOwner && (
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={toggleVisibility} title={container.is_public ? t('projectDash.publicTitle') : t('projectDash.privateTitle')}>
                {container.is_public ? `🔓 ${t('projectDash.public')}` : `🔒 ${t('projectDash.private')}`}
              </button>
            )}
            {!isOwner && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: 'var(--radius-pill)', padding: '6px 14px',
                fontSize: 12, fontWeight: 700, color: 'var(--muted)',
              }}>
                <i className="ti ti-eye" /> {t('projectDash.readOnly')}
              </span>
            )}
          </div>
          <div className="obt-hero-title">
            <h1>{container.name}</h1>
            {container.notes
              ? <p className="obt-hero-desc">{container.notes}</p>
              : isOwner ? <p className="obt-hero-desc obt-hero-desc--empty">{t('projectDash.noInfo')}</p> : null}
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">{t('projectDash.linesLabel')}</span> {lines.length}</div>
            <div className="obt-hero-info-row"><span className="obt-hero-info-label">{t('project.created')}</span> {formatDate(container.created_at)}</div>
          </div>
        </div>
      </div>

      <div className="obt-page">
        {isOwner && (
          <div className="obt-section-head">
            <div />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={openManage}>{t('projectDash.manage')}</button>
              <button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('projectDash.newLine')}</button>
            </div>
          </div>
        )}

        {isOwner && (
          <>
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

            <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('projectDash.editTitle')}>
              <div className="obt-field"><label>{t('dashboard.containerName')} *</label><input className="obt-input" type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required autoFocus /></div>
              <div className="obt-field"><label>{t('dashboard.notes')} <span className="obt-optional">{t('common.optional')}</span></label><textarea className="obt-textarea" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>

              <div style={{ borderTop: '0.5px solid var(--line)', margin: '14px 0', paddingTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={editForm.is_public} onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  {t('projectDash.shareCheckbox')}
                </label>
                <p className="obt-hint" style={{ marginTop: 6 }}>{editForm.is_public ? t('projectDash.shareHintPublic') : t('projectDash.shareHintPrivate')}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, opacity: editForm.is_public ? 1 : 0.45 }}>
                  <input className="obt-input" value={shareUrl} readOnly disabled={!editForm.is_public} onFocus={(e) => { if (editForm.is_public) e.target.select() }} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                  <button type="button" className="obt-btn obt-btn--ghost obt-btn--sm" onClick={copyLink} disabled={!editForm.is_public} style={{ whiteSpace: 'nowrap' }}>{copied ? t('projectDash.copied') : t('common.copy')}</button>
                </div>
              </div>

              <div className="obt-actions" style={{ marginTop: 8 }}>
                <button type="button" className="obt-btn obt-btn--primary" onClick={saveEdit}>{t('common.saveChanges')}</button>
                <button type="button" className="obt-btn obt-btn--ghost" onClick={() => setShowEdit(false)}>{t('common.cancel')}</button>
              </div>

              <div style={{ borderTop: '0.5px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
                <p className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{t('projectDash.dangerZone')}</p>
                <button type="button" className="obt-btn obt-btn--danger obt-btn--sm" onClick={deleteContainer}>🗑 {t('projectDash.deleteContainer')}</button>
              </div>
            </Modal>
          </>
        )}

        {lines.length === 0 ? (
          <div className="obt-panel obt-empty"><div className="obt-empty-icon">🥚</div><h3>{t('projectDash.empty')}</h3>{isOwner && <><p>{t('projectDash.emptyText')}</p><button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('projectDash.newLine')}</button></>}</div>
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
