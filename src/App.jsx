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
import Checklists from './pages/Checklists'
import ChecklistPage from './pages/ChecklistPage'
import Guide from './pages/Guide'
import News from './pages/News'

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

  // --- NON loggato -------------------------------------------------------
  // Le pagine informative (Guida, FAQ, Novita, Privacy, Crediti) sono pubbliche
  // e usano lo STESSO Layout dei loggati, che si adatta (niente pill-account,
  // mostra Accedi/Registrati). La landing "/" resta Login (ha il suo layout a
  // tutta pagina). Ogni altra rotta -> Login.
  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/guide" element={<Layout><Guide /></Layout>} />
        <Route path="/faq" element={<Layout><Guide initialTab="faq" /></Layout>} />
        <Route path="/news" element={<Layout><News /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/credits" element={<Layout><Credits /></Layout>} />
        {/* checklist linkabili: lettura pubblica anche senza account (vista read-only) */}
        <Route path="/journal/checklist/:checklistId" element={<Layout><ChecklistPage /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  // --- Loggato -----------------------------------------------------------
  const username = session.user?.user_metadata?.username || session.user?.email || ''

  return (
    <Layout username={username} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/journal" element={<Journal />} />
        {/* checklist PRIMA della rotta :entryId, sennò "checklist" verrebbe letto come id */}
        <Route path="/journal/checklist" element={<Checklists />} />
        <Route path="/journal/checklist/:checklistId" element={<ChecklistPage />} />
        <Route path="/journal/:entryId" element={<JournalEntry />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectDashboard />} />
        <Route path="/line/:id" element={<ProjectPage />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/faq" element={<Guide initialTab="faq" />} />
        <Route path="/news" element={<News />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
