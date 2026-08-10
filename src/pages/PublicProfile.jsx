// src/pages/PublicProfile.jsx
// Profilo pubblico condivisibile: /u/:username
// Mostra intestazione (nickname + bio + info) e i progetti/linee PUBBLICI
// dell'utente (cascata indipendente: solo visibility unlisted/public).
// Accessibile anche da anon. Se il profilo è privato o inesistente: not-found.
//
// La vetrina pet arriva nella consegna 2, si innesterà qui sotto.

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'

export default function PublicProfile() {
  const { t } = useT()
  const { username } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [username])

  const load = async () => {
    setLoading(true)
    // profilo per username, solo se non privato (RLS: profiles_public_read su unlisted/public)
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, username, bio, visibility, ovipets_plan, ovipets_year')
      .eq('username', username)
      .maybeSingle()
    if (!prof || prof.visibility === 'private') { setNotFound(true); setLoading(false); return }

    // contenuti pubblici dell'utente (cascata indipendente: la RLS già filtra,
    // ma restringiamo esplicitamente per chiarezza)
    const [{ data: prj }, { data: lns }] = await Promise.all([
      supabase.from('projects').select('*')
        .eq('owner_id', prof.id).in('visibility', ['unlisted', 'public'])
        .order('created_at', { ascending: false }),
      supabase.from('lines').select('*, species(name)')
        .eq('owner_id', prof.id).in('visibility', ['unlisted', 'public'])
        .order('created_at', { ascending: false }),
    ])

    setProfile(prof)
    setProjects(prj || [])
    setLines(lns || [])
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

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back" />
          <div className="obt-hero-title">
            <h1>{profile.username}</h1>
            {profile.bio && <p className="obt-hero-desc">{profile.bio}</p>}
          </div>
          <div className="obt-hero-info">
            {profile.ovipets_plan && (
              <div className="obt-hero-info-row">
                <span className="obt-hero-info-label">{t('publicProfile.plan')}</span> {profile.ovipets_plan}
              </div>
            )}
            {profile.ovipets_year && (
              <div className="obt-hero-info-row">
                <span className="obt-hero-info-label">{t('publicProfile.since')}</span> {profile.ovipets_year}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="obt-page">
        {/* Progetti pubblici */}
        {projects.length > 0 && (
          <div className="obt-panel">
            <h2 style={{ marginBottom: 12 }}>{t('publicProfile.projects')}</h2>
            <div className="obt-grid">
              {projects.map((c, i) => (
                <Link key={c.id} to={`/project/${c.id}`}
                  className={`obt-card ${['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3>{c.name}</h3>
                  {c.notes && <div className="obt-meta">{c.notes}</div>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Linee pubbliche (sciolte) */}
        {looseLines.length > 0 && (
          <div className="obt-panel">
            <h2 style={{ marginBottom: 12 }}>{t('publicProfile.lines')}</h2>
            <div className="obt-grid">
              {looseLines.map((l, i) => (
                <Link key={l.id} to={`/line/${l.id}`}
                  className={`obt-card ${['', 'obt-card--secondary', 'obt-card--tertiary'][i % 3]}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3>{l.name}</h3>
                  {l.species?.name && <div className="obt-meta">{l.species.name}</div>}
                </Link>
              ))}
            </div>
          </div>
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
