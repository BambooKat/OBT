import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Modal from './Modal'
import NewLineModal from './NewLineModal'
import { useT } from '../i18n'
import { useCardSort, SortControl } from './useCardSort'
import { useResearch, ResearchModal, SpeciesIcon } from './research'

function Dashboard() {
  const { t } = useT()
  const [containers, setContainers] = useState([])
  const [looseLines, setLooseLines] = useState([])
  const [lineCounts, setLineCounts] = useState({})
  const [usedSpeciesIds, setUsedSpeciesIds] = useState([])
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [showResearch, setShowResearch] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [bioDraft, setBioDraft] = useState('')
  const [paid, setPaid] = useState('')
  const [since, setSince] = useState('')
  const [favs, setFavs] = useState('')
  const [draft, setDraft] = useState({ paid: '', since: '', favs: '' })
  const [deleting, setDeleting] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [showNewContainer, setShowNewContainer] = useState(false)
  const [showNewLine, setShowNewLine] = useState(false)
  const [containerForm, setContainerForm] = useState({ name: '', notes: '' })
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    const { data: profile } = await supabase.from('profiles').select('username, bio, is_public, ovipets_plan, ovipets_year, favourites').eq('id', user.id).single()
    if (profile) {
      setUsername(profile.username)
      setBio(profile.bio || '')
      setIsPublic(!!profile.is_public)
      setPaid(profile.ovipets_plan || '')
      setSince(profile.ovipets_year || '')
      setFavs(profile.favourites || '')
    }
    const { data: speciesData } = await supabase.from('species').select('*').order('name', { ascending: true })
    setSpecies(speciesData || [])
    const { data: containersData } = await supabase.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setContainers(containersData || [])
    const { data: linesData } = await supabase.from('lines').select('*, species(name)').eq('owner_id', user.id).order('created_at', { ascending: false })
    const all = linesData || []
    setUsedSpeciesIds([...new Set(all.map(l => l.species_id).filter(Boolean))])
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
      owner_id: user.id, name: containerForm.name, notes: containerForm.notes || null, author: username || null,
    }).select('*').single()
    if (!error && data) {
      setContainers([data, ...containers])
      setShowNewContainer(false)
      setContainerForm({ name: '', notes: '' })
    }
  }

  const onLineCreated = (line) => setLooseLines([line, ...looseLines])

  const { species: allSpecies, levels, setLevels } = useResearch()
  // nello schema in alto stanno solo le specie che usi davvero (quelle delle
  // tue linee). Tutte le altre restano nel modal dei livelli, dove una lista
  // lunga non dà fastidio.
  // nello schema stanno tutte le specie di cui hai alzato il livello di ricerca:
  // vanno a capo da sole, quindi anche trenta non danno fastidio.
  const chips = allSpecies.filter(s => (levels[s.id] || 1) > 1)

  const species2 = allSpecies

  const containerSort = useCardSort({
    listKey: 'dash.containers', items: containers, table: 'projects', onReorder: setContainers,
  })
  const lineSort = useCardSort({
    listKey: 'dash.lines', items: looseLines, table: 'lines', onReorder: setLooseLines,
  })

  const saveProfile = async () => {
    setProfileError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({
      bio: bioDraft || null,
      ovipets_plan: draft.paid || null,
      ovipets_year: draft.since ? parseInt(draft.since) : null,
      favourites: draft.favs || null,
    }).eq('id', user.id)
    if (error) { setProfileError(t('profile.saveError')); return }
    setBio(bioDraft)
    setPaid(draft.paid); setSince(draft.since); setFavs(draft.favs)
    setShowEditProfile(false)
  }

  const togglePublic = async () => {
    setProfileError('')
    const next = !isPublic
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({ is_public: next }).eq('id', user.id)
    if (error) { setProfileError(t('profile.saveError')); return }
    setIsPublic(next)
  }

  const deleteAccount = async () => {
    if (!window.confirm(t('profile.deleteConfirm'))) return
    if (!window.confirm(t('profile.deleteConfirm2'))) return
    setDeleting(true)
    setProfileError('')
    const { error } = await supabase.functions.invoke('delete-account')
    if (error) { setProfileError(t('profile.deleteError')); setDeleting(false); return }
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const cardVariant = (i) => ['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]
  if (loading) return <div className="obt-loading">{t('common.loading')}</div>

  const nothing = containers.length === 0 && looseLines.length === 0

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back">
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setShowResearch(true)}>
              <i className="ti ti-microscope" /> {t('research.title')}
            </button>
            <button className="obt-btn obt-btn--ghost obt-btn--sm"
              onClick={() => { setBioDraft(bio); setDraft({ paid, since, favs }); setShowEditProfile(true) }}>
              <i className="ti ti-pencil" /> {t('profile.edit')}
            </button>
            <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={togglePublic}>
              {isPublic ? <><i className="ti ti-world" /> {t('profile.public')}</> : <><i className="ti ti-lock" /> {t('profile.private')}</>}
            </button>
          </div>

          <div className="obt-hero-title">
            <h1>{username || t('dashboard.title')}</h1>
            {bio
              ? <p className="obt-hero-desc" style={{ whiteSpace: 'pre-wrap' }}>{bio}</p>
              : <p className="obt-hero-desc obt-hero-desc--empty">{t('profile.noBio')}</p>}
          </div>

          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('profile.account')}</span>{' '}
              {paid ? t('profile.plan.' + paid) : '—'}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('profile.since')}</span>{' '}
              {since || '—'}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('dashboard.projectsTitle')}</span>{' '}
              {containers.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('dashboard.linesTitle')}</span>{' '}
              {looseLines.length}
            </div>
          </div>
        </div>

        {/* striscia dei livelli di ricerca: va a capo da sola */}
        {chips.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 9, paddingBottom: 9,
          }}>
            {chips.map(s => (
              <span key={s.id} title={`${s.name} — ${t('research.lvl')} ${levels[s.id]}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--card)', border: '1px solid var(--line)',
                  borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700,
                }}>
                <SpeciesIcon icon={s.icon} size={28} />
                <span style={{ color: 'var(--primary)' }}>{levels[s.id]}</span>
              </span>
            ))}
          </div>
        )}

        {profileError && <div className="obt-alert obt-alert--error" style={{ marginTop: 12 }}>{profileError}</div>}
      </div>

      <ResearchModal open={showResearch} onClose={() => setShowResearch(false)}
        species={species2} levels={levels} onChange={setLevels} />

      <Modal open={showEditProfile} onClose={() => setShowEditProfile(false)} title={t('profile.edit')}>
        <div className="obt-field">
          <label>{t('profile.bio')} <span className="obt-optional">{t('common.optional')}</span></label>
          <textarea className="obt-textarea" rows={4} maxLength={500} value={bioDraft}
            onChange={e => setBioDraft(e.target.value)} placeholder={t('profile.bioPlaceholder')} />
          <div className="obt-hint">{t('profile.bioHint')} · {bioDraft.length}/500</div>
        </div>

        <div className="obt-row">
          <div className="obt-field">
            <label>{t('profile.account')}</label>
            <select className="obt-select" value={draft.paid} onChange={e => setDraft({ ...draft, paid: e.target.value })}>
              <option value="">—</option>
              <option value="free">{t('profile.plan.free')}</option>
              <option value="paid">{t('profile.plan.paid')}</option>
              <option value="plus">{t('profile.plan.plus')}</option>
            </select>
          </div>
          <div className="obt-field">
            <label>{t('profile.since')}</label>
            <input type="number" className="obt-input" min={2010} max={2030} placeholder="2014"
  value={draft.since} onChange={e => setDraft({ ...draft, since: e.target.value })} />
          </div>
        </div>
        {/* campo "Preferite" rimosso dall'UI: i dati restano gestiti (profiles.favourites),
            basta reinserire un input legato a draft.favs per riattivarlo */}

        <div className="obt-actions">
          <button className="obt-btn obt-btn--primary" onClick={saveProfile}>{t('common.saveChanges')}</button>
          <button className="obt-btn obt-btn--ghost" onClick={() => setShowEditProfile(false)}>{t('common.cancel')}</button>
        </div>
        <div style={{ borderTop: '0.5px solid var(--line)', marginTop: 16, paddingTop: 14 }}>
          <p className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t('profile.dangerZone')}</p>
          <p className="obt-text-soft" style={{ fontSize: 12, marginBottom: 10 }}>{t('profile.deleteHint')}</p>
          <button className="obt-btn obt-btn--danger obt-btn--sm" onClick={deleteAccount} disabled={deleting}>
            <i className="ti ti-trash" /> {deleting ? t('profile.deleting') : t('profile.deleteAccount')}
          </button>
        </div>
      </Modal>
      <div className="obt-page">
        <div className="obt-section-head">
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="obt-btn obt-btn--ghost" onClick={() => setShowNewContainer(true)}>{t('dashboard.newContainer')}</button>
            <button className="obt-btn obt-btn--primary" onClick={() => setShowNewLine(true)}>{t('dashboard.newLine')}</button>
          </div>
          <div />
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
          <div className="obt-panel obt-empty"><div className="obt-empty-icon"><i className="ti ti-egg" /></div><h3>{t('dashboard.emptyTitle')}</h3><p>{t('dashboard.emptyText')}</p></div>
        ) : (
          <>
            {containers.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '8px 0 14px' }}>
                  <h2 style={{ fontSize: 18, margin: 0 }}>{t('dashboard.projectsTitle')}</h2>
                  <SortControl mode={containerSort.mode} setMode={containerSort.setMode} dragEnabled={containerSort.dragEnabled} />
                </div>
                <div className="obt-grid">
                  {containerSort.sorted.map((c, i) => (
                    <div key={c.id} onClick={() => navigate(`/project/${c.id}`)} className={`obt-card ${cardVariant(i)}`} {...containerSort.dragProps(c)}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '22px 0 14px' }}>
                  <h2 style={{ fontSize: 18, margin: 0 }}>{t('dashboard.linesTitle')}</h2>
                  <SortControl mode={lineSort.mode} setMode={lineSort.setMode} dragEnabled={lineSort.dragEnabled} />
                </div>
                <div className="obt-grid">
                  {lineSort.sorted.map((l, i) => (
                    <div key={l.id} onClick={() => navigate(`/line/${l.id}`)} className={`obt-card ${cardVariant(i)}`} {...lineSort.dragProps(l)}>
                      <span className="obt-badge">{l.species?.name || '—'}</span>
                      <h3>{l.name}</h3>
                      <div className="obt-meta"><i className="ti ti-user" /> {l.author || t('dashboard.authorUnset')}</div>
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
