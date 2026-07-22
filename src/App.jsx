import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectDashboard from './pages/ProjectDashboard'
import ProjectPage from './pages/ProjectPage'
import Layout from './pages/Layout'
import Credits from './pages/Credits'
import Privacy from './pages/Privacy'
import Journal from './pages/Journal'
import JournalEntry from './pages/JournalEntry'
import Guide from './pages/Guide'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40vh' }}>Caricamento...</div>
  }

  // NON loggato: Login ha già il suo layout a tutta pagina, non avvolgerlo con Layout
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Loggato: Layout contiene header/footer + shell per tutte le pagine interne
  const username = session.user?.user_metadata?.username || session.user?.email || ''

  return (
    <Layout username={username} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/journal/:entryId" element={<JournalEntry />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectDashboard />} />
        <Route path="/line/:id" element={<ProjectPage />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/faq" element={<Guide initialTab="faq" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
