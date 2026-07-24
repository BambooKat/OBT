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
  const [view, setView] = useState('analyse')
  const [petFilter, setPetFilter] = useState('')
  const [groupSel, setGroupSel] = useState('')        // '' = tutti i gruppi
  const [groupMode, setGroupMode] = useState('within') // within | exclude
  const [partnerId, setPartnerId] = useState('')       // vista Partner: pet scelto
  const [plan, setPlan] = useState([])   // [{ fId, mId, floor }] — piano di accoppiamento in costruzione

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

  // pet già impegnati: un pet in cooldown non può stare in due coppie insieme
  const usedPetIds = useMemo(() => {
    const s = new Set()
    for (const p of plan) { s.add(p.fId); s.add(p.mId) }
    return s
  }, [plan])

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

  // --- VISTA PARTNER (pet-centrica) --------------------------------------
  // Scelto un pet, elenca tutti i partner del sesso opposto ordinati per floor.
  // Stessa matematica della Classifica, ma è una riga della matrice invece di
  // tutti-contro-tutti: comodo quando hai in mente un pet preciso.
  const partnerSelf = pets.find(p => p.id === partnerId) || null
  const partnerRows = useMemo(() => {
    if (!hasTarget || !partnerSelf) return null
    const pool = partnerSelf.sex === 'F' ? males : partnerSelf.sex === 'M' ? females : []
    const out = []
    for (const p of pool) {
      if (areRelated(partnerSelf, p)) continue
      let floor = 0, ok = 0, tot = 0, valid = 0
      for (const s of slots) {
        // analyseSlot usa min/max dei due genitori: l'ordine madre/padre non
        // cambia il floor, quindi passo self e partner così come sono
        const d = analyseSlot((partnerSelf.colors || {})[s], (p.colors || {})[s], target[s])
        if (!d) continue
        valid++; floor += d.floor; ok += d.reachableChannels; tot += 3
      }
      if (!valid) continue
      out.push({ partner: p, floor, ok, tot })
    }
    out.sort((a, b) => a.floor - b.floor)
    return out
  }, [partnerSelf, males, females, slots, target, hasTarget, ancestorsOf])

  // f/m corretti a partire dal pet scelto e dal partner (per piano e analisi)
  const partnerFM = (self, partner) =>
    self.sex === 'F' ? { f: self, m: partner } : { f: partner, m: self }

  // Righe della Classifica arricchite con lo stato rispetto al piano.
  // busy  = uno dei due pet è già impegnato in una coppia scelta
  // kin   = la coppia condivide founder con una coppia già nel piano
  //         (non è vietata: è un avviso se stai cercando linee indipendenti)
  const visibleRows = useMemo(() => {
    if (!ranking) return []
    const q = petFilter.trim().toLowerCase()
    const rows = q
      ? ranking.rows.filter(r =>
          String(r.f.name).toLowerCase().includes(q) ||
          String(r.m.name).toLowerCase().includes(q) ||
          String(r.f.code || '').toLowerCase() === q ||
          String(r.m.code || '').toLowerCase() === q)
      : ranking.rows
    return rows.map(r => {
      const chosen = planPairKeys.has(r.f.id + ':' + r.m.id)
      const busyF = !chosen && usedPetIds.has(r.f.id)
      const busyM = !chosen && usedPetIds.has(r.m.id)
      let kinCodes = new Set()
      if (!chosen && !busyF && !busyM && planFounderSets.length) {
        const own = pairFounders(r)
        for (const set of planFounderSets) {
          for (const x of own) if (set.has(x)) kinCodes.add(x)
        }
      }
      return { ...r, chosen, busyF, busyM, busy: busyF || busyM, kin: kinCodes.size > 0, kinCodes }
    })
  }, [ranking, petFilter, planPairKeys, usedPetIds, planFounderSets])

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

  const viewTabs = [
    { key: 'analyse', label: t('project.inspector.tabAnalyse') },
    { key: 'ranking', label: t('project.inspector.tabRanking') },
    { key: 'partner', label: t('project.inspector.tabPartner') },
    { key: 'disjoint', label: t('project.inspector.tabDisjoint') },
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
            <select className="obt-select" value={motherId} onChange={e => setMotherId(e.target.value)}>
              <option value="">{t('project.inspector.choose')}</option>
              {females.map(p => (
                <option key={p.id} value={p.id}>G{p.generation} · {petLabel(p)}</option>
              ))}
            </select>
          </div>
          <div className="obt-field">
            <label>{t('project.pairs.father')}</label>
            <select className="obt-select" value={fatherId} onChange={e => setFatherId(e.target.value)}>
              <option value="">{t('project.inspector.choose')}</option>
              {males.map(p => (
                <option key={p.id} value={p.id}>G{p.generation} · {petLabel(p)}</option>
              ))}
            </select>
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

      {view === 'ranking' && (
        <>
        <div className="obt-panel">
          <h3 style={{ marginBottom: 6 }}>{t('project.inspector.rankTitle')}</h3>
          <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 12 }}>
            {t('project.inspector.rankHint')}
          </p>

          {!hasTarget ? (
            <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
              {t('project.inspector.noTarget')}
            </p>
          ) : (
          <>
          <GenFilter />
          <GroupFilter />

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <input
              type="text"
              value={petFilter}
              onChange={e => { setPetFilter(e.target.value); setRankLimit(25) }}
              placeholder={t('project.inspector.rankFilterPlaceholder')}
              className="obt-input"
              style={{ width: 210, padding: '5px 10px', fontSize: 12 }}
            />
            {petFilter && (
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={() => setPetFilter('')}>
                {t('common.cancel')}
              </button>
            )}
            <span className="obt-text-soft" style={{ fontSize: 12, marginLeft: 4 }}>
              {t('project.inspector.rankCount', { shown: visibleRows.length, skipped: ranking.skipped })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
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
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="obt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('project.pairs.mother')}</th>
                  <th>{t('project.pairs.father')}</th>
                  <th>{t('project.inspector.floor')}</th>
                  <th>{t('project.inspector.coverage')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, rankLimit).map((r, i) => (
                  <tr key={r.f.id + ':' + r.m.id} style={{
                    opacity: r.busy ? 0.4 : 1,
                    background: r.chosen ? 'var(--bg)' : undefined,
                  }}>
                    <td className="obt-text-soft">{i + 1}</td>
                    <td>
                      {petLabel(r.f)}
                      {r.busyF && <i className="ti ti-lock" title={t('project.inspector.rankBusy')} style={{ marginLeft: 5, color: 'var(--muted)' }} />}
                    </td>
                    <td>
                      {petLabel(r.m)}
                      {r.busyM && <i className="ti ti-lock" title={t('project.inspector.rankBusy')} style={{ marginLeft: 5, color: 'var(--muted)' }} />}
                    </td>
                    <td><Pill d={r.floor} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {r.ok}/{r.tot}
                      {!r.busy && r.kin && (
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
                ))}
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
          </>
          )}
        </div>
        </>
      )}

      {view === 'partner' && (
        <div className="obt-panel">
          <h3 style={{ marginBottom: 6 }}>{t('project.inspector.partnerTitle')}</h3>
          <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 14 }}>
            {t('project.inspector.partnerHint')}
          </p>

          {!hasTarget ? (
            <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
              {t('project.inspector.noTarget')}
            </p>
          ) : (
          <>
            <div className="obt-field" style={{ maxWidth: 420, marginBottom: 14 }}>
              <select className="obt-select" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                <option value="">{t('project.inspector.partnerChoose')}</option>
                {[...pets]
                  .sort((a, b) => (a.generation - b.generation) || String(a.name).localeCompare(String(b.name)))
                  .map(p => (
                    <option key={p.id} value={p.id}>G{p.generation} · {p.sex} · {petLabel(p)}</option>
                  ))}
              </select>
            </div>

            {partnerSelf && partnerRows && partnerRows.length === 0 && (
              <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
                {t('project.inspector.partnerEmpty')}
              </p>
            )}

            {partnerSelf && partnerRows && partnerRows.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="obt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('project.inspector.partnerCol')}</th>
                      <th>{t('project.inspector.floor')}</th>
                      <th>{t('project.inspector.coverage')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerRows.map((r, i) => {
                      const { f, m } = partnerFM(partnerSelf, r.partner)
                      const chosen = planPairKeys.has(f.id + ':' + m.id)
                      const busy = !chosen && (usedPetIds.has(f.id) || usedPetIds.has(m.id))
                      return (
                        <tr key={r.partner.id} style={{ opacity: busy ? 0.4 : 1, background: chosen ? 'var(--bg)' : undefined }}>
                          <td className="obt-text-soft">{i + 1}</td>
                          <td>
                            {petLabel(r.partner)}
                            {busy && <i className="ti ti-lock" title={t('project.inspector.rankBusy')} style={{ marginLeft: 5, color: 'var(--muted)' }} />}
                          </td>
                          <td><Pill d={r.floor} /></td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.ok}/{r.tot}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {chosen ? (
                              <button className="obt-btn obt-btn--ghost obt-btn--sm"
                                onClick={() => removeFromPlan(f.id, m.id)}>
                                {t('project.inspector.rankRemove')}
                              </button>
                            ) : (
                              <button className="obt-btn obt-btn--ghost obt-btn--sm"
                                disabled={busy}
                                onClick={() => addToPlan({ f, m, floor: r.floor })}>
                                <i className="ti ti-plus" /> {t('project.inspector.rankAdd')}
                              </button>
                            )}
                            <button className="obt-btn obt-btn--ghost obt-btn--sm" style={{ marginLeft: 6 }}
                              onClick={() => { setMotherId(f.id); setFatherId(m.id); setView('analyse') }}>
                              {t('project.inspector.rankOpen')}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
          )}
        </div>
      )}

      {view === 'verify' && <SuggesterTab pets={pets} project={project} isOwner={isOwner} onEditPet={onEditPet} />}

      {view === 'disjoint' && (
        <div className="obt-panel">
              <h3 style={{ marginBottom: 6 }}>{t('project.inspector.disjointTitle')}</h3>
              <p className="obt-text-soft" style={{ fontSize: 12, marginBottom: 12 }}>
                {t('project.inspector.disjointHint')}
              </p>
              {!hasTarget ? (
                <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14 }}>
                  {t('project.inspector.noTarget')}
                </p>
              ) : (
              <>
              <GenFilter />
              <GroupFilter />
              {disjointPairs.length === 0 && (
                <p className="obt-text-soft" style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                  {t('project.inspector.disjointEmpty')}
                </p>
              )}
              {disjointPairs.length > 0 && (
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
              )}
              </>
              )}
            </div>
      )}
    </>
  )
}
