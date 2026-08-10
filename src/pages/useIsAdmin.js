// src/pages/useIsAdmin.js
// Piccolo hook: l'utente loggato è admin? Legge profiles.is_admin una volta.
// Usato per mostrare il link al pannello news e per proteggere la pagina admin.

import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (alive) { setIsAdmin(false); setChecked(true) } return }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (alive) { setIsAdmin(!!data?.is_admin); setChecked(true) }
    })()
    return () => { alive = false }
  }, [])

  return { isAdmin, checked }
}
