import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Componente che mostra le mutazioni di una specie come tag cliccabili,
// raggruppate per zona del corpo, con sezioni apri/chiudi.
// selectedIds: array di id mutazioni già selezionate
// onChange: funzione chiamata con il nuovo array quando l'utente clicca un tag
function MutationSelector({ speciesId, selectedIds, onChange }) {
  const [mutations, setMutations] = useState([])
  const [loading, setLoading] = useState(true)
  const [openZones, setOpenZones] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMutations()
  }, [speciesId])

  const loadMutations = async () => {
    if (!speciesId) return
    setLoading(true)
    const { data } = await supabase
      .from('mutations')
      .select('*')
      .eq('species_id', speciesId)
      .order('name', { ascending: true })

    setMutations(data || [])
    setLoading(false)
  }

  const toggleMutation = (mutationId) => {
    if (selectedIds.includes(mutationId)) {
      onChange(selectedIds.filter(id => id !== mutationId))
    } else {
      onChange([...selectedIds, mutationId])
    }
  }

  const toggleZone = (zone) => {
    setOpenZones({ ...openZones, [zone]: !openZones[zone] })
  }

  if (loading) return <div className="obt-loading" style={{ minHeight: 80 }}>Caricamento mutazioni...</div>

  const filtered = search
    ? mutations.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : mutations

  const zones = {}
  filtered.forEach(m => {
    const zone = m.body_zone || 'Altro'
    if (!zones[zone]) zones[zone] = []
    zones[zone].push(m)
  })

  const sortedZoneNames = Object.keys(zones).sort()
  const selectedMutations = mutations.filter(m => selectedIds.includes(m.id))

  return (
    <div className="obt-mutation-box">
      <input
        className="obt-input"
        type="text"
        placeholder="Cerca mutazione..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {selectedMutations.length > 0 && (
        <div className="obt-selected-strip">
          <div className="obt-hint" style={{ marginBottom: 8 }}>
            Selezionate ({selectedMutations.length})
          </div>
          <div className="obt-chips">
            {selectedMutations.map(m => (
              <span
                key={m.id}
                onClick={() => toggleMutation(m.id)}
                className={`obt-chip obt-chip--removable${m.is_event ? ' obt-chip--event' : ''}`}
                title="Clicca per rimuovere"
              >
                {m.name}{m.is_event ? ` [${m.event_season}]` : ''} ✕
              </span>
            ))}
          </div>
        </div>
      )}

      {sortedZoneNames.map(zone => (
        <div key={zone} className="obt-zone">
          <div className="obt-zone-head" onClick={() => toggleZone(zone)}>
            <span>{zone} <span className="obt-zone-count">({zones[zone].length})</span></span>
            <span className="obt-zone-arrow">{openZones[zone] || search ? '▾' : '▸'}</span>
          </div>

          {(openZones[zone] || search) && (
            <div className="obt-zone-body">
              {zones[zone].map(m => {
                const isSelected = selectedIds.includes(m.id)
                return (
                  <span
                    key={m.id}
                    onClick={() => toggleMutation(m.id)}
                    className={`obt-chip${isSelected ? ' obt-chip--selected' : ''}${isSelected && m.is_event ? ' obt-chip--event' : ''}`}
                  >
                    {m.name}{m.is_event ? ' 🍂' : ''}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default MutationSelector