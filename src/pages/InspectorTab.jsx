// src/pages/InspectorTab.jsx
// Tab "Ispettore di coppia" — nessuna previsione, solo fatti matematici.
// Per ogni canale RGB di ogni slot verifica se il target è "bracketato" dai due
// genitori: se sì quel canale è raggiungibile (floor 0), se no resta la distanza
// al bordo più vicino. Somma dei floor per slot = distanza minima raggiungibile.
// Metrica identica a ProjectPage/SuggesterTab, così i numeri combaciano sempre.

import { useState, useMemo, useEffect } from 'react'
import { useT } from '../i18n'
import Help from './Help'
import { slotsOf, hexToRgb, totalDist, petLabel, Pill, downloadCsv, analyseSlot } from './petUtils'
import SuggesterTab from './SuggesterTab'
import PetPicker from './PetPicker'


const Swatch = ({ hex, size = 16 }) => {
  if (!hex) return <span style={{ color: 'var(--ink-soft)' }}>-</span>
  const clean = hex.startsWith('#') ? hex : `#${hex}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: size, height: size, borderRadius: 4,
        background: clean, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0,
      }} />
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{clean.toUpperCase()}</span>
    </span>
  )
}

const CH = ['R', 'G', 'B']

// --- rendering della barra range per un canale ---
function ChannelBar({ c }) {
  const pct = (v) => (v / 255) * 100
  const left = pct(c.lo), width = Math.max(pct(c.hi) - pct(c.lo), 0.8)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, width: 12, color: 'var(--ink-soft)' }}>{c.name}</span>
      <div style={{
        position: 'relative', flex: '0 0 850px', maxWidth: '100%', height: 10, borderRadius: 5,
        background: 'var(--line)', overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0,
          borderRadius: 5,
          background: c.inRange ? 'var(--primary)' : 'var(--bad-text)',
          opacity: c.inRange ? 0.85 : 0.38,
        }} />
        <div style={{
          position: 'absolute', left: `${pct(c.target)}%`, top: -3, bottom: -3,
          width: 2, marginLeft: -1,
          background: c.inRange ? 'var(--ink)' : 'var(--bad-text)',
        }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 11, width: 108, flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--ink-soft)' }}>
        {c.lo}–{c.hi} → {c.target}
      </span>
      <span style={{
        fontFamily: 'monospace', fontSize: 11, width: 42, flexShrink: 0, whiteSpace: 'nowrap',
        textAlign: 'right', fontWeight: 700,
        color: c.inRange ? 'var(--primary)' : 'var(--bad-text)',
      }}>
        {c.inRange ? '0' : `+${c.gap}`}
      </span>
    </div>
  )
}


// tooltip "?" (stesso stile di ProjectPage)
// legenda per leggere le barre dei canali
function ChannelLegend() {
  const { t } = useT()
  const Sample = ({ inRange }) => (
    <span style={{
      position: 'relative', display: 'inline-block', width: 84, height: 10,
      borderRadius: 5, background: 'var(--line)', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', left: inRange ? '20%' : '58%', width: '34%', top: 0, bottom: 0,
        borderRadius: 5,
        background: inRange ? 'var(--primary)' : 'var(--bad-text)',
        opacity: inRange ? 0.85 : 0.38,
      }} />
      <span style={{
        position: 'absolute', left: inRange ? '40%' : '30%', top: -3, bottom: -3,
        width: 2, marginLeft: -1,
        background: inRange ? 'var(--ink)' : 'var(--bad-text)',
      }} />
    </span>
  )
  const Row = ({ inRange, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <Sample inRange={inRange} />
      <span className="obt-text-soft" style={{ fontSize: 12 }}>{text}</span>
    </div>
  )
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 10, padding: '10px 12px', marginBottom: 4,
    }}>
      <Row inRange={true} text={t('project.inspector.legendReach')} />
      <Row inRange={false} text={t('project.inspector.legendUnreach')} />
      <p className="obt-text-soft" style={{ fontSize: 11, margin: '8px 0 0' }}>
        {t('project.inspector.legendNote')}
      </p>
    </div>
  )
}

export default function InspectorTab({ pets, project, isOwner, onEditPet }) {
  const { t } = useT()
  const [motherId, setMotherId] = useState('')
  const [fatherId, setFatherId] = useState('')
  const [rankGen, setRankGen] = useState('')
  const [rankLimit, setRankLimit] = useState(25)
  const [rankExportN, setRankExportN] = useState(50)
  // Lab a 3 tab: 'plan' (Pianifica: ex Classifica+Partner+Compatibili),
  // 'analyse' (scheda dettaglio di una coppia), 'verify' (Risultati coppie).
  const [view, setView] = useState('plan')
  const [petFilter, setPetFilter] = useState('')
  const [groupSel, setGroupSel] = useState('')        // '' = tutti i gruppi
  const [groupMode, setGroupMode] = useState('within') // within | exclude
  // "Fissa un pet": vista pet-centrica (ex Partner). Scelto un pet, la lista
  // mostra i partner del SESSO OPPOSTO ordinati per floor — non le coppie del
  // piano. '' = classifica completa (tutte le coppie).
  const [fixedPetId, setFixedPetId] = useState('')
  // Modalità della lista: 'single' = coppie singole (Classifica/Partner),
  // 'disjoint' = coppie di coppie compatibili (ex tab Compatibili).
  const [planMode, setPlanMode] = useState('single')  // single | disjoint
  const [plan, setPlan] = useState([])   // [{ fId, mId, floor }] — piano di accoppiamento in costruzione

  // --- Granularità dell'assortimento ------------------------------------
  // Quando scegli una coppia, cosa consideri "impegnato" e non riproponibile?
  //   pet       = il singolo animale (universale, default per chi non ha etichette)
  //   code      = il campo Codice del pet (es. A1A1, A2A2)
  //   group_tag = il campo Gruppo del pet
  //   parents   = la covata (madre|padre): tutti i figli di una coppia collassano
  // keyLen accorcia la chiave ai primi N caratteri. Lo slider va da 1 a
  // maxKeyLen e l'estremo destro (= maxKeyLen) vale "intera": la scala cresce
  // nel verso intuitivo, senza un valore speciale che faccia saltare il pollice.
  const [keyMode, setKeyMode] = useState('pet')  // pet | code | group_tag | parents
  const [keyLen, setKeyLen] = useState(99)        // >= maxKeyLen = intera
  // sexAware: quando ON, la chiave include il sesso, così scegliere un maschio
  // di un gruppo non spegne le femmine dello stesso gruppo. Realizza la regola
  // "un maschio + una femmina per gruppo/covata". Inerte con keyMode 'pet'.
  const [sexAware, setSexAware] = useState(false)
  const [hideBusy, setHideBusy] = useState(false) // nascondi del tutto le coppie escluse dal piano
  // "Solo preferiti": quando ON, la lista mostra solo le coppie con almeno un
  // pet favorito (⭐). Shortlist per indecisione — favoriti i candidati che ti
  // piacciono e vedi solo i loro abbinamenti. Indipendente da ♂+♀.
  const [favOnly, setFavOnly] = useState(false)

  const slots = slotsOf(project)
  const slotLabel = (key) => t('project.slot.' + key)
  const target = project?.target_colors || {}
  const hasTarget = slots.some(s => hexToRgb(target[s]))

  const females = useMemo(
    () => pets.filter(p => p.sex === 'F').sort((a, b) => (a.generation - b.generation) || String(a.name).localeCompare(String(b.name))),
    [pets]
  )
  const males = useMemo(
    () => pets.filter(p => p.sex === 'M').sort((a, b) => (a.generation - b.generation) || String(a.name).localeCompare(String(b.name))),
    [pets]
  )

  const mother = pets.find(p => p.id === motherId) || null
  const father = pets.find(p => p.id === fatherId) || null

  const analysis = useMemo(() => {
    if (!mother || !father || !project) return null
    const rows = slots.map(s => ({
      slot: s,
      motherHex: (mother.colors || {})[s],
      fatherHex: (father.colors || {})[s],
      targetHex: target[s],
      data: analyseSlot((mother.colors || {})[s], (father.colors || {})[s], target[s]),
    }))
    const valid = rows.filter(r => r.data)
    if (!valid.length) return null
    const floor = valid.reduce((a, r) => a + r.data.floor, 0)
    const md = totalDist(mother, project), fd = totalDist(father, project)
    const mid = md != null && fd != null ? (md + fd) / 2 : null
    const totalChannels = valid.length * 3
    const okChannels = valid.reduce((a, r) => a + r.data.reachableChannels, 0)
    const okSlots = valid.filter(r => r.data.fullyReachable).length
    return {
      rows, floor, motherDist: md, fatherDist: fd, mid,
      totalChannels, okChannels, okSlots, totalSlots: valid.length,
      incomplete: rows.length !== valid.length,
    }
  }, [mother, father, project, slots, target])

  // figli già nati da questa coppia
  const existing = useMemo(() => {
    if (!mother || !father) return []
    return pets
      .filter(p => p.mother_id === mother.id && p.father_id === father.id)
      .map(p => ({ pet: p, d: totalDist(p, project) }))
      .filter(x => x.d != null)
      .sort((a, b) => a.d - b.d)
  }, [mother, father, pets, project])

  const inbred =
    mother && father && (
      (mother.mother_id && mother.mother_id === father.mother_id) ||
      (mother.father_id && mother.father_id === father.father_id) ||
      mother.id === father.mother_id || father.id === mother.father_id ||
      mother.mother_id === father.id || father.father_id === mother.id
    )

    const generations = useMemo(
    () => [...new Set(pets.map(p => p.generation ?? 0))].sort((a, b) => a - b),
    [pets]
  )

  // Antenati fino ai bisnonni: stessa profondità della griglia Coppie, così le
  // due schermate concordano su cosa sia consanguineo.
  const ancestorsOf = useMemo(() => {
    const byId = new Map(pets.map(p => [p.id, p]))
    const cache = new Map()
    return (id) => {
      if (cache.has(id)) return cache.get(id)
      const res = new Set()
      const stack = [[id, 0]]
      while (stack.length) {
        const [cur, depth] = stack.pop()
        if (cur == null || res.has(cur)) continue
        res.add(cur)
        if (depth < 3) {
          const p = byId.get(cur)
          if (p) { stack.push([p.mother_id, depth + 1]); stack.push([p.father_id, depth + 1]) }
        }
      }
      cache.set(id, res)
      return res
    }
  }, [pets])

  const areRelated = (f, m) => {
    const A = ancestorsOf(f.id), B = ancestorsOf(m.id)
    for (const x of A) if (B.has(x)) return true
    return false
  }

  // Classifica di TUTTE le coppie possibili, escluse quelle vietate dal gioco.
  const groups = useMemo(
    () => [...new Set(pets.map(p => p.group_tag).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [pets]
  )
  // filtro gruppo: 'within' = entrambi i genitori nel gruppo scelto,
  // 'exclude' = nessuno dei due nel gruppo scelto. Serve a tenere separate
  // le sotto-linee (es. i lock rosso/verde/blu) finché non le vuoi incrociare.
  const passGroup = (f, m) => {
    if (!groupSel) return true
    if (groupMode === 'exclude') return f.group_tag !== groupSel && m.group_tag !== groupSel
    return f.group_tag === groupSel && m.group_tag === groupSel
  }

  const ranking = useMemo(() => {
    if (!hasTarget) return null
    const pick = (list) => rankGen === '' ? list : list.filter(p => String(p.generation ?? 0) === rankGen)
    const fs = pick(females), ms = pick(males)
    const out = []
    let skipped = 0
    for (const f of fs) {
      for (const m of ms) {
        if (!passGroup(f, m)) continue
        if (areRelated(f, m)) { skipped++; continue }
        let floor = 0, ok = 0, tot = 0, valid = 0
        for (const s of slots) {
          const d = analyseSlot((f.colors || {})[s], (m.colors || {})[s], target[s])
          if (!d) continue
          valid++; floor += d.floor; ok += d.reachableChannels; tot += 3
        }
        if (!valid) continue
        out.push({ f, m, floor, ok, tot })
      }
    }
    out.sort((a, b) => a.floor - b.floor)
    return { rows: out, skipped, considered: fs.length * ms.length }
  }, [females, males, rankGen, slots, target, hasTarget, ancestorsOf, groupSel, groupMode])

  // I founder di un pet si ricavano risalendo la genealogia fino alla G0:
  // leggere le lettere del nome non funziona per i G0 stessi, che non ne hanno.
  const founderCodes = useMemo(() => {
    const byId = new Map(pets.map(p => [p.id, p]))
    const cache = new Map()
    const walk = (id) => {
      if (id == null) return new Set()
      if (cache.has(id)) return cache.get(id)
      const p = byId.get(id)
      let res
      if (!p) res = new Set()
      else if ((p.generation ?? 0) === 0) res = new Set([p.code || p.name])
      else {
        res = new Set()
        for (const x of walk(p.mother_id)) res.add(x)
        for (const x of walk(p.father_id)) res.add(x)
      }
      cache.set(id, res)
      return res
    }
    return walk
  }, [pets])

  const pairFounders = (r) => {
    const set = new Set()
    for (const x of founderCodes(r.f.id)) set.add(x)
    for (const x of founderCodes(r.m.id)) set.add(x)
    return set
  }

  // --- CHIAVE DI ASSORTIMENTO -------------------------------------------
  // keyOf(pet) restituisce l'etichetta con cui un pet "occupa" una risorsa nel
  // piano. In modalità 'pet' ogni animale è unico (comportamento storico); in
  // 'code'/'group_tag' più pet collassano sulla stessa chiave, così scegliendone
  // uno spegni tutti i suoi simili. keyLen>0 tronca ai primi N caratteri.
  // Fallback all'id quando il campo scelto è vuoto: un pet senza codice resta
  // sempre distinguibile invece di collassare con tutti gli altri "senza codice".
  const petKeyMap = useMemo(() => {
    // keyLen alto → slice restituisce l'intera stringa: nessun caso speciale.
    const truncate = (s) => String(s).slice(0, keyLen)
    const m = new Map()
    for (const p of pets) {
      let raw
      if (keyMode === 'code') raw = p.code
      else if (keyMode === 'group_tag') raw = p.group_tag
      else if (keyMode === 'parents')
        // covata = madre|padre. I G0 non hanno genitori → raw null → id (restano
        // individui a sé: raggruppare per covata pet senza covata non ha senso).
        raw = (p.mother_id && p.father_id) ? p.mother_id + '|' + p.father_id : null
      else raw = null
      // campo vuoto o modalità 'pet' → chiave = id (unicità per individuo).
      // 'parents' non si tronca: è una coppia di id, keyLen non ha senso.
      let key = raw
        ? 'k:' + (keyMode === 'parents' ? raw : truncate(raw))
        : 'id:' + p.id
      // sesso-aware: due pet dello stesso gruppo ma sesso diverso → chiavi
      // distinte, così un maschio non "occupa" le femmine del gruppo. Solo se
      // il pet ha davvero una chiave di gruppo (raw): un id: è già unico.
      if (sexAware && keyMode !== 'pet' && raw) key += '::' + (p.sex || '?')
      m.set(p.id, key)
    }
    return m
  }, [pets, keyMode, keyLen, sexAware])
  const keyOf = (petOrId) => {
    const id = typeof petOrId === 'string' ? petOrId : petOrId?.id
    return petKeyMap.get(id) ?? ('id:' + id)
  }

  // Campi disponibili come chiave: mostro nel menù solo quelli davvero popolati,
  // così un utente senza codici non vede opzioni morte.
  const hasCode = useMemo(() => pets.some(p => p.code), [pets])
  const hasGroupTag = useMemo(() => pets.some(p => p.group_tag), [pets])
  const hasParents = useMemo(() => pets.some(p => p.mother_id && p.father_id), [pets])
  const hasFavorites = useMemo(() => pets.some(p => p.favorite), [pets])
  // lunghezza massima utile per lo slider: la chiave più lunga fra i valori del
  // campo scelto (oltre non ha effetto)
  const maxKeyLen = useMemo(() => {
    // Lo slider di profondità ha senso solo per chiavi testuali (code/group_tag).
    // 'pet' non ha chiave; 'parents' è una coppia di id, non si tronca.
    if (keyMode === 'pet' || keyMode === 'parents') return 0
    let mx = 1
    for (const p of pets) {
      const raw = keyMode === 'code' ? p.code : p.group_tag
      if (raw) mx = Math.max(mx, String(raw).length)
    }
    return mx
  }, [pets, keyMode])

  // --- PIANO DI ACCOPPIAMENTO -------------------------------------------
  // Il piano vive in localStorage per progetto: non è un dato di gioco, è una
  // bozza di lavoro, quindi non vale la pena farne una tabella su DB.
  const planKey = project?.id ? `obt.plan.${project.id}` : null

  useEffect(() => {
    if (!planKey) return
    try {
      const raw = localStorage.getItem(planKey)
      setPlan(raw ? JSON.parse(raw) : [])
    } catch { setPlan([]) }
  }, [planKey])

  useEffect(() => {
    if (!planKey) return
    try { localStorage.setItem(planKey, JSON.stringify(plan)) } catch { /* quota piena, pazienza */ }
  }, [plan, planKey])

  // pet già impegnati: un pet in cooldown non può stare in due coppie insieme.
  // Questo vincolo è FISICO e resta sempre per-individuo, a prescindere dalla
  // granularità scelta per l'assortimento.
  const usedPetIds = useMemo(() => {
    const s = new Set()
    for (const p of plan) { s.add(p.fId); s.add(p.mId) }
    return s
  }, [plan])

  // chiavi già impegnate secondo la granularità scelta: in modalità 'code'/
  // 'group_tag' basta che UN pet della chiave sia nel piano perché l'intera
  // chiave risulti occupata (è ciò che spegne "i soliti 5 e 2" di ogni riga).
  const usedKeys = useMemo(() => {
    const s = new Set()
    for (const p of plan) { s.add(keyOf(p.fId)); s.add(keyOf(p.mId)) }
    return s
  }, [plan, petKeyMap])

  const planPairKeys = useMemo(
    () => new Set(plan.map(p => p.fId + ':' + p.mId)),
    [plan]
  )

  // founder già usati dal piano, coppia per coppia: serve a segnalare le righe
  // che sarebbero imparentate con qualcosa che hai già scelto
  const planFounderSets = useMemo(
    () => plan.map(p => {
      const set = new Set()
      for (const x of founderCodes(p.fId)) set.add(x)
      for (const x of founderCodes(p.mId)) set.add(x)
      return set
    }),
    [plan, founderCodes]
  )

  const planRows = useMemo(() => plan.map(p => ({
    ...p,
    f: pets.find(x => x.id === p.fId),
    m: pets.find(x => x.id === p.mId),
  })).filter(r => r.f && r.m), [plan, pets])

  const addToPlan = (r) => setPlan(prev =>
    prev.some(p => p.fId === r.f.id && p.mId === r.m.id)
      ? prev
      : [...prev, { fId: r.f.id, mId: r.m.id, floor: Math.round(r.floor) }]
  )
  const removeFromPlan = (fId, mId) =>
    setPlan(prev => prev.filter(p => !(p.fId === fId && p.mId === mId)))

  const exportPlan = () => {
    const rows = planRows.map((r, i) => ({
      n: i + 1, madre: r.f.name, padre: r.m.name, floor: r.floor,
    }))
    const slug = (project?.name || 'linea').replace(/[^\w-]+/g, '_')
    downloadCsv(rows, `${slug}_piano_accoppiamenti.csv`)
  }

  // Cerca due coppie che non condividano nemmeno un founder: sono le uniche
  // che possono dare figli incrociabili tra loro (e quindi una breeding pair).
  const disjointPairs = useMemo(() => {
    if (!ranking) return []
    const pool = ranking.rows.slice(0, 300).map(r => ({ r, fset: pairFounders(r) }))
    const out = []
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const A = pool[i], B = pool[j]
        let clash = false
        for (const x of A.fset) if (B.fset.has(x)) { clash = true; break }
        if (clash) continue
        out.push({ a: A.r, b: B.r, aF: A.fset, bF: B.fset, worst: Math.max(A.r.floor, B.r.floor) })
      }
    }
    out.sort((x, y) => x.worst - y.worst)
    return out.slice(0, 20)
  }, [ranking, founderCodes])

  // Righe della Classifica arricchite con lo stato rispetto al piano.
  // busy  = uno dei due pet è già impegnato in una coppia scelta
  // kin   = la coppia condivide founder con una coppia già nel piano
  //         (non è vietata: è un avviso se stai cercando linee indipendenti)
  const visibleRows = useMemo(() => {
    if (!ranking) return []
    const q = petFilter.trim().toLowerCase()
    let rows = q
      ? ranking.rows.filter(r =>
          String(r.f.name).toLowerCase().includes(q) ||
          String(r.m.name).toLowerCase().includes(q) ||
          String(r.f.code || '').toLowerCase() === q ||
          String(r.m.code || '').toLowerCase() === q)
      : ranking.rows
    // "Fissa un pet" (vista Partner): la lista mostra i partner del sesso opposto,
    // cioè le coppie che contengono quel pet (le righe della classifica sono già
    // F×M, quindi filtrare per id dà esattamente il sesso opposto).
    if (fixedPetId) rows = rows.filter(r => r.f.id === fixedPetId || r.m.id === fixedPetId)
    // "Solo preferiti": in classifica basta che uno dei due sia favorito; in
    // vista Partner conta il partner (il pet fissato è sempre lo stesso).
    if (favOnly) {
      rows = fixedPetId
        ? rows.filter(r => (r.f.id === fixedPetId ? r.m : r.f).favorite)
        : rows.filter(r => r.f.favorite || r.m.favorite)
    }
    const mapped = rows.map(r => {
      const chosen = planPairKeys.has(r.f.id + ':' + r.m.id)
      // Con un pet fissato siamo in vista Partner: il pet compare in OGNI riga,
      // quindi l'esclusione per gruppo/covata non ha senso (spegnerebbe tutto).
      // Uso l'occupazione per singolo id: una femmina già impegnata altrove nel
      // piano appare lucchettata, il maschio fissato no.
      const busyF = !chosen && (fixedPetId ? usedPetIds.has(r.f.id) : usedKeys.has(keyOf(r.f.id)))
      const busyM = !chosen && (fixedPetId ? usedPetIds.has(r.m.id) : usedKeys.has(keyOf(r.m.id)))
      // Il pet fissato non va mai marcato busy per sé stesso.
      const bf = busyF && r.f.id !== fixedPetId
      const bm = busyM && r.m.id !== fixedPetId
      let kinCodes = new Set()
      if (!chosen && !bf && !bm && planFounderSets.length) {
        const own = pairFounders(r)
        for (const set of planFounderSets) {
          for (const x of own) if (set.has(x)) kinCodes.add(x)
        }
      }
      return { ...r, chosen, busyF: bf, busyM: bm, busy: bf || bm, kin: kinCodes.size > 0, kinCodes }
    })

    // Opzione: nascondi del tutto le coppie escluse (ma non quelle già scelte).
    const filtered = hideBusy ? mapped.filter(r => r.chosen || !r.busy) : mapped

    // Riordino stabile in 3 fasce senza toccare l'ordine per floor dentro
    // ciascuna: coppie scelte in cima (riferimento), poi le attive, poi le busy
    // in coda — così lo scroll e il "mostra altre" non sprecano righe su escluse.
    const rank = (r) => (r.chosen ? 0 : r.busy ? 2 : 1)
    return filtered
      .map((r, i) => [r, i])            // indice originale = tie-breaker → ordine per floor preservato
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
      .map(([r]) => r)
  }, [ranking, petFilter, fixedPetId, favOnly, planPairKeys, usedPetIds, usedKeys, petKeyMap, planFounderSets, hideBusy])

  const exportRanking = () => {
    if (!ranking) return
    const n = Math.max(1, Math.min(rankExportN, ranking.rows.length))
    const rows = ranking.rows.slice(0, n).map((r, i) => {
      const g0 = [...pairFounders(r)].sort()
      return {
        pos: i + 1,
        madre: r.f.name,
        padre: r.m.name,
        floor: Math.round(r.floor),
        canali_ok: r.ok,
        canali_tot: r.tot,
        g0_usati: g0.join(''),
        g0_distinti: g0.length,
      }
    })
    const slug = (project?.name || 'linea').replace(/[^\w-]+/g, '_')
    downloadCsv(rows, `${slug}_classifica_coppie.csv`)
  }

  // stesso filtro in Classifica e Compatibili: condividono rankGen, così
  // spostandosi tra le due tab la generazione scelta resta quella
  const GenFilter = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700 }}>
        {t('project.filter.generation')}
      </span>
      {['', ...generations.map(String)].map(g => (
        <button
          key={g || 'all'}
          onClick={() => { setRankGen(g); setRankLimit(25) }}
          style={{
            padding: '4px 12px', borderRadius: 'var(--radius-pill)',
            border: g === rankGen ? '2px solid var(--primary)' : '2px solid var(--line)',
            background: g === rankGen ? 'var(--primary)' : 'var(--card)',
            color: g === rankGen ? '#fff' : 'var(--ink)',
            fontWeight: g === rankGen ? 700 : 600, fontSize: 12,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {g === '' ? t('project.filter.allGens') : `G${g}`}
        </button>
      ))}
    </div>
  )

  const pillStyle = (active) => ({
    padding: '4px 12px', borderRadius: 'var(--radius-pill)',
    border: active ? '2px solid var(--primary)' : '2px solid var(--line)',
    background: active ? 'var(--primary)' : 'var(--card)',
    color: active ? '#fff' : 'var(--ink)',
    fontWeight: active ? 700 : 600, fontSize: 12,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  // filtro gruppo: appare solo se nella linea esiste almeno un gruppo.
  // Selezionato un gruppo, un piccolo toggle sceglie dentro/escludi.
  const GroupFilter = () => groups.length === 0 ? null : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700 }}>
        {t('project.inspector.groupLabel')}
      </span>
      {['', ...groups].map(g => (
        <button key={g || 'all'} onClick={() => setGroupSel(g)} style={pillStyle(g === groupSel)}>
          {g === '' ? t('project.inspector.groupAll') : g}
        </button>
      ))}
      {groupSel && (
        <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
          {['within', 'exclude'].map(mode => (
            <button
              key={mode}
              onClick={() => setGroupMode(mode)}
              style={{ ...pillStyle(mode === groupMode), padding: '3px 10px' }}
            >
              {mode === 'within' ? t('project.inspector.groupWithin') : t('project.inspector.groupExclude')}
            </button>
          ))}
        </span>
      )}
    </div>
  )

  // Controllo granularità dell'assortimento: sceglie SU COSA il piano considera
  // un pet "impegnato". Opzione (a): campo + slider lunghezza sempre visibili.
  const keyModeOptions = [
    { key: 'pet', label: t('project.inspector.grainPet') },
    ...(hasCode ? [{ key: 'code', label: t('project.inspector.grainCode') }] : []),
    ...(hasGroupTag ? [{ key: 'group_tag', label: t('project.inspector.grainGroup') }] : []),
    ...(hasParents ? [{ key: 'parents', label: t('project.inspector.grainParents') }] : []),
  ]
  const GranularityControl = () => {
    // Se l'unica opzione è 'pet' (nessun codice né gruppo nella linea) non ha
    // senso mostrare il controllo: c'è una sola granularità possibile.
    if (keyModeOptions.length <= 1) return null
    return (
      <>
        <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, marginLeft: 6 }}>
          {t('project.inspector.grainLabel')}
        </span>
        {keyModeOptions.map(o => (
          <button
            key={o.key}
            onClick={() => { setKeyMode(o.key); setKeyLen(99) }}
            style={pillStyle(o.key === keyMode)}
            title={t('project.inspector.grainHint')}
          >
            {o.label}
          </button>
        ))}
        {keyMode !== 'pet' && maxKeyLen > 1 && (() => {
          // Valore effettivo mostrato sullo slider, sempre dentro [1, maxKeyLen]:
          // se keyLen è il sentinel "grande", combacia con max = estremo destro.
          // Clampare qui evita che React riallinei il pollice a ogni render.
          const shown = Math.min(Math.max(keyLen, 1), maxKeyLen)
          const isFull = shown >= maxKeyLen
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 6 }}>
              <span className="obt-text-soft" style={{ fontSize: 12 }}>
                {t('project.inspector.grainLen')}
              </span>
              <input
                type="range"
                min={1} max={maxKeyLen} step={1}
                value={shown}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  // estremo destro = "intera": salvo il sentinel così resta piena
                  // anche se in futuro compaiono codici più lunghi.
                  setKeyLen(v >= maxKeyLen ? 99 : v)
                }}
                style={{ width: 140 }}
                title={t('project.inspector.grainLenHint')}
              />
              <span style={{
                fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                minWidth: 54, color: 'var(--ink-soft)',
              }}>
                {isFull ? t('project.inspector.grainLenFull') : `${shown} ${t('project.inspector.grainLenChars')}`}
              </span>
            </span>
          )
        })()}
        {/* Toggle "un maschio + una femmina per gruppo". Appare solo con una
            granularità di gruppo attiva: con 'pet' il sesso è già implicito. */}
        {keyMode !== 'pet' && (
          <button
            onClick={() => setSexAware(v => !v)}
            style={{ ...pillStyle(sexAware), marginLeft: 6 }}
            title={t('project.inspector.sexAwareHint')}
          >♂+♀</button>
        )}
      </>
    )
  }

  const viewTabs = [
    { key: 'plan', label: t('project.inspector.tabPlan') },
    { key: 'analyse', label: t('project.inspector.tabAnalyse') },
    { key: 'verify', label: t('project.inspector.tabVerify') },
  ]

  return (
    <>
      <div className="obt-subtabs" style={{ marginBottom: 16 }}>
        {viewTabs.map(v => (
          <button
            key={v.key}
            className={'obt-subtab' + (view === v.key ? ' is-active' : '')}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'analyse' && (
        <>
      <div className="obt-panel">
        <h3 style={{ marginBottom: 6 }}>{t('project.inspector.title')}</h3>
        <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
          {t('project.inspector.hint')}
        </p>

        <div className="obt-row">
          <div className="obt-field">
            <label>{t('project.pairs.mother')}</label>
            <PetPicker pets={females} value={motherId} onChange={setMotherId} />
          </div>
          <div className="obt-field">
            <label>{t('project.pairs.father')}</label>
            <PetPicker pets={males} value={fatherId} onChange={setFatherId} />
          </div>
        </div>

        {!hasTarget && (
          <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
            {t('project.inspector.noTarget')}
          </p>
        )}
      </div>

      {analysis && (
        <>
          {/* --- riepilogo --- */}
          <div className="obt-panel">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
              <div>
                <div className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t('project.inspector.floor')}<Help text={t('project.inspector.floorHelp')} />
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>
                  <Pill d={analysis.floor} />
                </div>
                <div className="obt-text-soft" style={{ fontSize: 12, marginTop: 2 }}>
                  {t('project.inspector.floorHint')}
                </div>
              </div>
              <div>
                <div className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t('project.inspector.coverage')}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.5 }}>
                  {analysis.okChannels}/{analysis.totalChannels}
                </div>
                <div className="obt-text-soft" style={{ fontSize: 12 }}>
                  {analysis.okSlots}/{analysis.totalSlots} {t('project.inspector.slotsFull')}
                </div>
              </div>
              <div>
                <div className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t('project.inspector.parents')}
                </div>
                <div style={{ fontSize: 14, lineHeight: 2 }}>
                  ♀ <Pill d={analysis.motherDist} />&nbsp;&nbsp;♂ <Pill d={analysis.fatherDist} />
                </div>
                <div className="obt-text-soft" style={{ fontSize: 12 }}>
                  {t('project.suggester.midParent')}: {analysis.mid != null ? Math.round(analysis.mid) : '-'}
                </div>
              </div>
            </div>

            {analysis.incomplete && (
              <p className="obt-hint" style={{ marginTop: 12 }}>{t('project.inspector.incomplete')}</p>
            )}
            {inbred && (
              <p className="obt-hint" style={{ marginTop: 8 }}><i className="ti ti-alert-triangle" /> {t('project.inspector.inbred')}</p>
            )}
          </div>

          {/* --- dettaglio per slot --- */}
          <div className="obt-panel">
            <h3 style={{ marginBottom: 10 }}>{t('project.inspector.perSlot')}</h3>
            <ChannelLegend />
            {analysis.rows.map(r => (
              <div key={r.slot} style={{
                borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12,
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                  <strong style={{ minWidth: 110 }}>{slotLabel(r.slot)}</strong>
                  <span style={{ fontSize: 12 }}>♀ <Swatch hex={r.motherHex} /></span>
                  <span style={{ fontSize: 12 }}>♂ <Swatch hex={r.fatherHex} /></span>
                  <span style={{ fontSize: 12 }}><i className="ti ti-target-arrow" /> <Swatch hex={r.targetHex} /></span>
                  {r.data && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="obt-text-soft" style={{ fontSize: 12 }}>{t('project.inspector.slotFloor')}</span>
                      <Pill d={r.data.floor} />
                    </span>
                  )}
                </div>
                {r.data ? (
                  r.data.channels.map(c => <ChannelBar key={c.name} c={c} />)
                ) : (
                  <p className="obt-text-soft" style={{ fontSize: 13 }}>{t('project.inspector.slotMissing')}</p>
                )}
              </div>
            ))}
          </div>

          {/* --- figli già ottenuti --- */}
          {existing.length > 0 && (
            <div className="obt-panel">
              <h3 style={{ marginBottom: 6 }}>{t('project.inspector.existingTitle')}</h3>
              <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
                {t('project.inspector.existingHint')}
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="obt-table">
                  <thead>
                    <tr>
                      <th>{t('project.table.name')}</th>
                      <th>{t('project.table.sex')}</th>
                      <th>{t('project.table.distance')}</th>
                      <th>{t('project.inspector.vsFloor')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existing.map(({ pet, d }) => (
                      <tr key={pet.id}>
                        <td><strong>{pet.name}</strong></td>
                        <td>{pet.sex}</td>
                        <td><Pill d={d} /></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          +{Math.round(d - analysis.floor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}

      {view === 'plan' && (
        <>
        <div className="obt-panel">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ marginBottom: 6 }}>{t('project.inspector.planViewTitle')}</h3>
              <p className="obt-text-soft" style={{ fontSize: 13, margin: 0 }}>
                {planMode === 'disjoint'
                  ? t('project.inspector.disjointHint')
                  : (fixedPetId ? t('project.inspector.partnerHint') : t('project.inspector.rankHint'))}
              </p>
            </div>
            {/* Export della classifica in alto a destra: separato dall'export del
                piano (che sta nel riquadro piano) per non confondere i due CSV. */}
            {hasTarget && ranking && ranking.rows.length > 0 && planMode === 'single' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number" min="1" max={ranking.rows.length}
                    value={rankExportN}
                    onChange={e => setRankExportN(parseInt(e.target.value) || 1)}
                    style={{
                      width: 70, padding: '5px 8px', fontSize: 12, fontWeight: 600,
                      border: '2px solid var(--line)', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'inherit',
                    }}
                    title={t('project.inspector.rankExportN')}
                  />
                  <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={exportRanking}>
                    <i className="ti ti-download" /> {t('project.export.csv')}
                  </button>
                </span>
                <span className="obt-text-soft" style={{ fontSize: 12 }}>
                  {t('project.inspector.rankCount', { shown: visibleRows.length, skipped: ranking.skipped })}
                </span>
              </div>
            )}
          </div>

          {!hasTarget ? (
            <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
              {t('project.inspector.noTarget')}
            </p>
          ) : (
          <>
          {GenFilter()}
          {GroupFilter()}

          {/* Riga inline: Mostra + (se classifica piena) Raggruppa per + slider + ♂+♀.
              La riga si ACCORCIA togliendo controlli da destra quando fissi un pet
              o passi a compatibili — mai spezzarsi in altezza (evita gli scatti). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700 }}>
              {t('project.inspector.modeLabel')}
            </span>
            {['single', 'disjoint'].map(mode => (
              <button key={mode} onClick={() => setPlanMode(mode)} style={pillStyle(mode === planMode)}>
                {mode === 'single' ? t('project.inspector.modeSingle') : t('project.inspector.modeDisjoint')}
              </button>
            ))}
            {planMode === 'single' && !fixedPetId && GranularityControl()}
            {planMode === 'single' && hasFavorites && (
              <button
                onClick={() => setFavOnly(v => !v)}
                style={{ ...pillStyle(favOnly), marginLeft: 6 }}
                title={t('project.inspector.favOnlyHint')}
              >
                <i className="ti ti-star" style={{ marginRight: 4 }} />
                {t('project.inspector.favOnly')}
              </button>
            )}
          </div>

          {/* Fissa un pet (vista Partner) + filtro pet, stessa riga, larghezze pari.
              Solo in modalità coppie singole. */}
          {planMode === 'single' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
                <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t('project.inspector.fixPetLabel')}
                </span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <PetPicker
                    pets={pets}
                    value={fixedPetId}
                    onChange={setFixedPetId}
                    showSex
                    placeholder={t('project.inspector.partnerChoose')}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
                <span className="obt-text-soft" style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t('project.inspector.filterPetLabel')}
                </span>
                <input
                  type="text"
                  value={petFilter}
                  onChange={e => { setPetFilter(e.target.value); setRankLimit(25) }}
                  placeholder={t('project.inspector.rankFilterPlaceholder')}
                  className="obt-input"
                  style={{ flex: 1, minWidth: 160 }}
                />
                {petFilter && (
                  <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setPetFilter('')}>
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </div>
          )}

          {(!ranking || ranking.rows.length === 0) && (
            <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
              {t('project.inspector.rankEmpty')}
            </p>
          )}

          {ranking && ranking.rows.length > 0 && (
          <>

          {/* --- piano di accoppiamento --- */}
          {planRows.length > 0 && (
            <div style={{
              border: '2px solid var(--primary)', borderRadius: 'var(--radius)',
              padding: '12px 14px', marginBottom: 16, background: 'var(--bg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13 }}>
                  <i className="ti ti-clipboard-list" /> {t('project.inspector.planTitle')}
                </strong>
                <span className="obt-text-soft" style={{ fontSize: 12 }}>
                  {t('project.inspector.planCount', { n: planRows.length, pets: usedPetIds.size })}
                  {keyMode !== 'pet' && ` · ${t('project.inspector.planKeys', { keys: usedKeys.size })}`}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={exportPlan}>
                    <i className="ti ti-download" /> {t('project.export.csv')}
                  </button>
                  <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setPlan([])}>
                    {t('project.inspector.planClear')}
                  </button>
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {planRows.map((r, i) => (
                  <span key={r.fId + ':' + r.mId} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--card)', border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-pill)', padding: '5px 6px 5px 12px', fontSize: 12,
                  }}>
                    <span className="obt-text-soft">{i + 1}.</span>
                    <span>♀ {r.f.name} × ♂ {r.m.name}</span>
                    <Pill d={r.floor} />
                    <button
                      onClick={() => removeFromPlan(r.fId, r.mId)}
                      title={t('project.inspector.planRemove')}
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: '0 4px',
                      }}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {planMode === 'single' && (
          <>
          {(hideBusy || visibleRows.some(r => r.busy)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button
                onClick={() => setHideBusy(v => !v)}
                style={{ ...pillStyle(hideBusy), padding: '3px 10px' }}
                title={t('project.inspector.rankHideBusyHint')}
              >
                <i className={`ti ti-${hideBusy ? 'eye-off' : 'eye'}`} style={{ marginRight: 4 }} />
                {t('project.inspector.rankHideBusy')}
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="obt-table">
              <thead>
                <tr>
                  <th>#</th>
                  {fixedPetId ? (
                    <th>{t('project.inspector.partnerCol')}</th>
                  ) : (
                    <>
                      <th>{t('project.pairs.mother')}</th>
                      <th>{t('project.pairs.father')}</th>
                    </>
                  )}
                  <th>{t('project.inspector.floor')}</th>
                  <th>{t('project.inspector.coverage')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, rankLimit).map((r, i) => {
                  // In vista Partner mostro solo il pet del sesso opposto a quello
                  // fissato: è "il partner". Fuori da lì, le due colonne madre/padre.
                  const partner = fixedPetId
                    ? (r.f.id === fixedPetId ? r.m : r.f)
                    : null
                  const partnerBusy = partner
                    ? (r.f.id === fixedPetId ? r.busyM : r.busyF)
                    : false
                  return (
                  <tr key={r.f.id + ':' + r.m.id} style={{
                    opacity: r.busy ? 0.4 : 1,
                    background: r.chosen ? 'var(--bg)' : undefined,
                  }}>
                    <td className="obt-text-soft">{i + 1}</td>
                    {fixedPetId ? (
                      <td>
                        {petLabel(partner)}
                        {partnerBusy && <i className="ti ti-lock" title={t('project.inspector.rankBusy')} style={{ marginLeft: 5, color: 'var(--muted)' }} />}
                      </td>
                    ) : (
                      <>
                        <td>
                          {petLabel(r.f)}
                          {r.busyF && <i className="ti ti-lock" title={t('project.inspector.rankBusy')} style={{ marginLeft: 5, color: 'var(--muted)' }} />}
                        </td>
                        <td>
                          {petLabel(r.m)}
                          {r.busyM && <i className="ti ti-lock" title={t('project.inspector.rankBusy')} style={{ marginLeft: 5, color: 'var(--muted)' }} />}
                        </td>
                      </>
                    )}
                    <td><Pill d={r.floor} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {r.ok}/{r.tot}
                      {/* Avviso consanguineità col piano: inutile in vista Partner,
                          dove il pet fissato è founder condiviso di ogni riga. */}
                      {!fixedPetId && !r.busy && r.kin && (
                        <i className="ti ti-alert-triangle"
                          title={t('project.inspector.rankKin', { codes: [...r.kinCodes].sort().join(', ') })}
                          style={{ marginLeft: 6, color: 'var(--bad-text)' }} />
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.chosen ? (
                        <button className="obt-btn obt-btn--ghost obt-btn--sm"
                          onClick={() => removeFromPlan(r.f.id, r.m.id)}>
                          {t('project.inspector.rankRemove')}
                        </button>
                      ) : (
                        <button className="obt-btn obt-btn--ghost obt-btn--sm"
                          disabled={r.busy}
                          onClick={() => addToPlan(r)}>
                          <i className="ti ti-plus" /> {t('project.inspector.rankAdd')}
                        </button>
                      )}
                      <button className="obt-btn obt-btn--ghost obt-btn--sm" style={{ marginLeft: 6 }}
                        onClick={() => { setMotherId(r.f.id); setFatherId(r.m.id); setView('analyse') }}>
                        {t('project.inspector.rankOpen')}
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {visibleRows.length > rankLimit && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setRankLimit(n => n + 25)}>
                {t('project.inspector.rankMore')}
              </button>
            </div>
          )}
          </>
          )}

          {/* --- modalità Compatibili: due coppie senza founder condivisi --- */}
          {planMode === 'disjoint' && (
            disjointPairs.length === 0 ? (
              <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                {t('project.inspector.disjointEmpty')}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="obt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('project.inspector.disjointA')}</th>
                      <th>{t('project.inspector.disjointB')}</th>
                      <th>{t('project.inspector.disjointWorst')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disjointPairs.map((d, i) => (
                      <tr key={i}>
                        <td className="obt-text-soft">{i + 1}</td>
                        <td>
                          {d.a.f.name} × {d.a.m.name}
                          <span className="obt-text-soft" style={{ fontFamily: 'monospace', fontSize: 11, marginLeft: 6 }}>
                            [{[...d.aF].sort().join('')}] <Pill d={d.a.floor} />
                          </span>
                        </td>
                        <td>
                          {d.b.f.name} × {d.b.m.name}
                          <span className="obt-text-soft" style={{ fontFamily: 'monospace', fontSize: 11, marginLeft: 6 }}>
                            [{[...d.bF].sort().join('')}] <Pill d={d.b.floor} />
                          </span>
                        </td>
                        <td><Pill d={d.worst} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          </>
          )}
          </>
          )}
        </div>
        </>
      )}

      {view === 'verify' && <SuggesterTab pets={pets} project={project} isOwner={isOwner} onEditPet={onEditPet} />}
    </>
  )
}
