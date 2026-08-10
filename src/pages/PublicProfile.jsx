// src/pages/PublicProfile.jsx
// Profilo pubblico condivisibile: /u/:username
// Rispecchia la Dashboard ma in sola lettura (niente Modifica/Ricerca/Linkable):
// stessa intestazione, stesso box info (account, anno, conteggi), stessa striscia
// dei livelli di ricerca, stesse card (con linguetta) per progetti e linee.
// Mostra SOLO contenuti unlisted/public (cascata indipendente). Anon ammessi.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { SpeciesIcon } from './research'

export default function PublicProfile() {
  const { t } = useT()
  const { username } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [lineCounts, setLineCounts] = useState({})
  const [species, setSpecies] = useState([])
  const [levels, setLevels] = useState({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [username])

  const load = async () => {
    setLoading(true)
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, username, bio, visibility, ovipets_plan, ovipets_year')
      .eq('username', username)
      .maybeSingle()
    if (!prof || prof.visibility === 'private') { setNotFound(true); setLoading(false); return }

    const [{ data: prj }, { data: lns }, { data: sp }, { data: us }] = await Promise.all([
      supabase.from('projects').select('*')
        .eq('owner_id', prof.id).in('visibility', ['unlisted', 'public'])
        .order('created_at', { ascending: false }),
      supabase.from('lines').select('*, species(name)')
        .eq('owner_id', prof.id).in('visibility', ['unlisted', 'public'])
        .order('created_at', { ascending: false }),
      supabase.from('species').select('id, name, icon').order('name', { ascending: true }),
      supabase.from('user_species').select('species_id, research_level').eq('user_id', prof.id),
    ])

    const allLines = lns || []
    const counts = {}
    allLines.forEach(l => { if (l.project_id) counts[l.project_id] = (counts[l.project_id] || 0) + 1 })
    const lvlMap = {}
    ;(us || []).forEach(r => { lvlMap[r.species_id] = r.research_level })

    setProfile(prof)
    setProjects(prj || [])
    setLines(allLines)
    setLineCounts(counts)
    setSpecies(sp || [])
    setLevels(lvlMap)
    setLoading(false)
  }

  if (loading) return <div className="obt-loading">{t('common.loading')}</div>
  if (notFound) return (
    <div className="obt-page">
      <div className="obt-panel obt-empty">
        <div className="obt-empty-icon"><i className="ti ti-user-off" /></div>
        <h3>{t('publicProfile.notFound')}</h3>
        <button className="obt-btn obt-btn--primary" onClick={() => navigate('/')}>&larr; {t('publicProfile.home')}</button>
      </div>
    </div>
  )

  const looseLines = lines.filter(l => !l.project_id)
  const cardVariant = (i) => ['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]
  const chips = species.filter(s => (levels[s.id] || 1) > 1)

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back" />
          <div className="obt-hero-title">
            <h1>{profile.username}</h1>
            {profile.bio
              ? <p className="obt-hero-desc" style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
              : <p className="obt-hero-desc obt-hero-desc--empty">{t('profile.noBio')}</p>}
          </div>
          <div className="obt-hero-info">
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('profile.account')}</span>{' '}
              {profile.ovipets_plan ? t('profile.plan.' + profile.ovipets_plan) : '—'}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('profile.since')}</span>{' '}
              {profile.ovipets_year || '—'}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('dashboard.projectsTitle')}</span>{' '}
              {projects.length}
            </div>
            <div className="obt-hero-info-row">
              <span className="obt-hero-info-label">{t('dashboard.linesTitle')}</span>{' '}
              {looseLines.length}
            </div>
          </div>
        </div>

        {/* striscia livelli di ricerca (come la dashboard) */}
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
      </div>

      <div className="obt-page">
        {projects.length > 0 && (
          <>
            <div style={{ margin: '8px 0 14px' }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{t('dashboard.projectsTitle')}</h2>
            </div>
            <div className="obt-grid">
              {projects.map((c, i) => (
                <div key={c.id} onClick={() => navigate(`/project/${c.id}`)} className={`obt-card ${cardVariant(i)}`} style={{ cursor: 'pointer' }}>
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
            <div style={{ margin: '22px 0 14px' }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{t('dashboard.linesTitle')}</h2>
            </div>
            <div className="obt-grid">
              {looseLines.map((l, i) => (
                <div key={l.id} onClick={() => navigate(`/line/${l.id}`)} className={`obt-card ${cardVariant(i)}`} style={{ cursor: 'pointer' }}>
                  <span className="obt-badge">{l.species?.name || '—'}</span>
                  <h3>{l.name}</h3>
                  <div className="obt-meta"><i className="ti ti-user" /> {l.author || t('dashboard.authorUnset')}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {projects.length === 0 && looseLines.length === 0 && (
          <div className="obt-panel obt-empty">
            <div className="obt-empty-icon"><i className="ti ti-folder-open" /></div>
            <h3>{t('publicProfile.empty')}</h3>
          </div>
        )}
      </div>
    </>
  )
}
