// src/pages/PetShowcase.jsx
// Vetrina pet riusabile. Due modi:
//   editable=true  (Dashboard): form aggiungi + elimina + ordinamento
//   editable=false (profilo pubblico): sola lettura, nome all'hover
//
// Card-cornice bianca bordata: il bordo "giustifica" lo sfondo bianco
// dell'immagine OviPets. Nome opzionale, etichetta che sale dal basso all'hover.
// Immagine da petImageUrl(ID); click → petLinkUrl (URL validato o fallback app).

import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { useCardSort, SortControl } from './useCardSort'
import { useConfirm } from './ConfirmDialog'
import { extractPetId, validatePetUrl, petImageUrl, petLinkUrl } from './ovipets'

const MAX_PETS = 24

export default function PetShowcase({ ownerId, editable = false }) {
  const { t } = useT()
  const { confirm, dialog } = useConfirm()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({ ref: '', label: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => { if (ownerId) load() }, [ownerId])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profile_pets')
      .select('*').eq('owner_id', ownerId)
    // alias name = label (per useCardSort); senza-nome in fondo con sentinella alta
    const mapped = (data || []).map(p => ({ ...p, name: p.label || '\uffff' }))
    setPets(mapped)
    setLoading(false)
  }

  // ordinamento riusato dalla dashboard (custom/alpha/recent)
  const sort = useCardSort({
    listKey: 'showcase:' + ownerId,
    items: pets,
    table: 'profile_pets',
    onReorder: setPets,
    canReorder: editable,
  })

  const addPet = async () => {
    setError('')
    const petId = extractPetId(draft.ref)
    if (!petId) { setError(t('showcase.invalidRef')); return }
    if (pets.length >= MAX_PETS) { setError(t('showcase.full')); return }
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const petUrl = validatePetUrl(draft.ref)
    const { data, error } = await supabase.from('profile_pets').insert({
      owner_id: user.id,
      pet_id: petId,
      pet_url: petUrl,
      label: draft.label.trim() || null,
    }).select('*').single()
    if (error) { setError(t('showcase.saveError')); setAdding(false); return }
    setPets(prev => [...prev, { ...data, name: data.label || '\uffff' }])
    setDraft({ ref: '', label: '' })
    setAdding(false)
  }

  const removePet = (p) => confirm({
    message: t('showcase.deleteConfirm'), danger: true,
    onConfirm: async () => {
      const { error } = await supabase.from('profile_pets').delete().eq('id', p.id)
      if (error) { setError(t('showcase.saveError')); return }
      setPets(prev => prev.filter(x => x.id !== p.id))
    },
  })

  if (loading) return null
  if (!editable && pets.length === 0) return null // sul profilo pubblico, se vuota non mostrare nulla

  return (
    <div className="obt-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{t('showcase.title')}</h2>
        {pets.length > 0 && (
          <SortControl mode={sort.mode} setMode={sort.setMode} dragEnabled={sort.dragEnabled} />
        )}
      </div>

      {editable && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 240px' }}>
            <input className="obt-input" value={draft.ref}
              onChange={e => setDraft({ ...draft, ref: e.target.value })}
              placeholder={t('showcase.refPlaceholder')} />
            <div className="obt-hint">{t('showcase.refHint')}</div>
          </div>
          <input className="obt-input" value={draft.label} style={{ flex: '1 1 140px' }}
            onChange={e => setDraft({ ...draft, label: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') addPet() }}
            placeholder={t('showcase.labelPlaceholder')} />
          <button className="obt-btn obt-btn--primary" onClick={addPet}
            disabled={adding || !draft.ref.trim() || pets.length >= MAX_PETS}>
            <i className="ti ti-plus" /> {t('common.add')}
          </button>
        </div>
      )}

      {error && <div className="obt-alert obt-alert--error" style={{ marginBottom: 12 }}>{error}</div>}
      {editable && (
        <div className="obt-hint" style={{ marginBottom: 10 }}>
          {pets.length}/{MAX_PETS}
        </div>
      )}

      <div className="obt-showcase-grid">
        {sort.sorted.map(p => (
          <div key={p.id} className="obt-showcase-card" {...(editable ? sort.dragProps(p) : {})}>
            <a href={petLinkUrl(p.pet_id, p.pet_url)} target="_blank" rel="noopener noreferrer"
              className="obt-showcase-imgwrap" title={p.label || undefined}>
              <img src={petImageUrl(p.pet_id)} alt={p.label || 'pet'} loading="lazy"
                onError={e => { e.currentTarget.style.opacity = 0.25 }} />
              {p.label && <span className="obt-showcase-label">{p.label}</span>}
            </a>
            {editable && (
              <button className="obt-showcase-del" title={t('common.delete')}
                onClick={() => removePet(p)}>
                <i className="ti ti-trash" />
              </button>
            )}
          </div>
        ))}
      </div>

      {dialog}
    </div>
  )
}
