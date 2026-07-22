// Cancella l'account di CHI CHIAMA e tutti i suoi dati.
// Gira su Supabase, non sul sito: usa la service role key, che non deve
// mai finire nel frontend. Supabase la inietta da sola come variabile
// d'ambiente, quindi qui non va scritta né committata.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) {
      return new Response(JSON.stringify({ error: 'not authenticated' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Chi sta chiamando? Il token decide: non si può cancellare un altro utente.
    const jwt = auth.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'invalid token' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Cancellazione esplicita dei contenuti, in ordine di dipendenza.
    // Le CASCADE dovrebbero già bastare, ma meglio non dipendere solo da quelle.
    await admin.from('user_species').delete().eq('user_id', user.id)
    await admin.from('lines').delete().eq('owner_id', user.id)
    await admin.from('projects').delete().eq('owner_id', user.id)
    await admin.from('profiles').delete().eq('id', user.id)

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})