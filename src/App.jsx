import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Dashboard from './Dashboard'
import Layout from './Layout' // <-- importa Layout

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

  // Qui è la chiave: Layout avvolge tutto
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