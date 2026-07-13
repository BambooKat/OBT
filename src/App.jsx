import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'           // <-- aggiunto /pages
import Dashboard from './pages/Dashboard'   // <-- aggiunto /pages
import Layout from './pages/Layout'         // <-- aggiunto /pages

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', marginTop: '40vh'}}>Caricamento...</div>
  }

  return (
    <Layout 
      username={session?.user?.email} 
      onLogout={session ? () => supabase.auth.signOut() : null}
    >
      {!session ? <Login /> : <Dashboard />}
    </Layout>
  )
}

export default App