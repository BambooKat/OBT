import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Dashboard from './Dashboard' // o come si chiama la tua home

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Recupera sessione esistente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Ascolta cambi login/logout
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
    <>
      {!session ? <Login /> : <Dashboard />}
    </>
  )
}

export default App