// src/pages/newsUtils.js
// Helper condivisi per il sistema Novità (announcements).
//
// Il "badge" nell'header si accende quando esiste un annuncio pubblicato più
// recente dell'ultima volta che l'utente ha aperto /news. Lo stato "letto"
// vive su DB per gli utenti loggati (tabella announcement_reads) e in
// localStorage per gli anonimi. Qui isoliamo quella logica così Layout e News
// la condividono senza duplicarla.

import { supabase } from '../supabaseClient'

const LS_KEY = 'obt.news.lastReadAt'

// Timestamp (ISO) dell'annuncio pubblicato più recente, o null se non ce ne sono.
export async function fetchLatestPublishedAt() {
  const { data, error } = await supabase
    .from('announcements')
    .select('created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data.created_at
}

// Tutti gli annunci pubblicati, pinnati in cima, poi per data decrescente.
export async function fetchPublishedAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

// Ultimo "letto" dell'utente: da DB se loggato, da localStorage se anonimo.
export async function getLastReadAt(userId) {
  if (userId) {
    const { data } = await supabase
      .from('announcement_reads')
      .select('last_read_at')
      .eq('user_id', userId)
      .maybeSingle()
    return data?.last_read_at ?? null
  }
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

// Segna "letto fino ad ora". Su DB (upsert) se loggato, in localStorage se anon.
export async function markRead(userId) {
  const now = new Date().toISOString()
  if (userId) {
    await supabase
      .from('announcement_reads')
      .upsert({ user_id: userId, last_read_at: now }, { onConflict: 'user_id' })
    return
  }
  try {
    localStorage.setItem(LS_KEY, now)
  } catch {
    /* storage pieno o disabilitato: pazienza, il badge resterà acceso */
  }
}

// C'è una novità da leggere? Confronta l'ultimo annuncio col "letto" dell'utente.
export async function hasUnread(userId) {
  const latest = await fetchLatestPublishedAt()
  if (!latest) return false
  const lastRead = await getLastReadAt(userId)
  if (!lastRead) return true            // mai aperto → è "nuovo"
  return new Date(latest) > new Date(lastRead)
}
