// src/pages/ovipets.js
// Estrazione e validazione dei riferimenti pet OviPets.
// Accetta tre forme in ingresso:
//   - ID nudo:  522752731
//   - link app: https://app.ovipets.com/pet/522752731
//   - link web: https://ovipets.com/#!/?src=pets&sub=profile&usr=4614743&pet=522752731
// Da tutte estrae l'ID (solo cifre). L'immagine si costruisce SEMPRE dall'ID
// (mai dall'URL incollato) → nessun URL arbitrario finisce come <img src>.

// Estrae l'ID pet da ID nudo o da un link OviPets. Ritorna string di cifre o null.
export function extractPetId(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  // ID nudo (solo cifre)
  if (/^\d+$/.test(s)) return s
  // link immagine (pulsante "Condividi → Image"): /img/pet/NUMERO
  let m = s.match(/app\.ovipets\.com\/img\/pet\/(\d+)/i)
  if (m) return m[1]
  // link app: /pet/NUMERO
  m = s.match(/app\.ovipets\.com\/pet\/(\d+)/i)
  if (m) return m[1]
  // link web: ...pet=NUMERO
  m = s.match(/[?&#]pet=(\d+)/i)
  if (m && /ovipets\.com/i.test(s)) return m[1]
  return null
}

// Valida un URL "vai al pet" incollato: deve essere uno dei due pattern noti.
// Ritorna l'URL se valido, altrimenti null. (Se l'utente ha incollato un ID
// nudo, non c'è URL: si passa null e il click userà il fallback app.)
export function validatePetUrl(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d+$/.test(s)) return null // ID nudo: nessun URL originale
  if (/^https:\/\/app\.ovipets\.com\/pet\/\d+/i.test(s)) return s
  if (/^https:\/\/(www\.)?ovipets\.com\/#!\/\?.*pet=\d+/i.test(s)) return s
  return null
}

// URL immagine, sempre costruito dall'ID (dominio fisso).
export function petImageUrl(petId) {
  return `https://app.ovipets.com/img/pet/${petId}`
}

// URL "vai al pet": l'originale validato se c'è, altrimenti fallback app dall'ID.
export function petLinkUrl(petId, petUrl) {
  return petUrl || `https://app.ovipets.com/pet/${petId}`
}
