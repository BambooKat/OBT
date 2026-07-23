import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

// Modal riusabile. Si chiude con Esc o col bottone ✕ (NON al click fuori, per non perdere dati).
//
// Nota sullo scroll: qui NON si tocca lo scroll in nessun modo.
// Storia dei tentativi falliti, per non ripeterli:
//  - overflow:hidden sul body  -> con html{overflow-y:scroll} la pagina torna in cima
//  - position:fixed sul body   -> stesso effetto se l'effetto si rimonta
//  - focus({preventScroll})    -> il browser scrolla lo stesso l'input dell'overlay
// L'overlay è già position:fixed con scroll interno, quindi non serve altro.
// NON usare auto-Focus nei form dentro il modal: scrolla la pagina.
//
// Props:
//   open: boolean, se mostrare il modal
//   onClose: funzione chiamata alla chiusura
//   title: titolo mostrato in alto
//   size: 'sm' | 'md' | 'lg' (default 'md')
//   children: contenuto del modal (tipicamente un form)
//
// Modali sovrapposti: dal Laboratorio si apre il form pet SOPRA la lista figli.
// Uno stack a livello di modulo tiene traccia dell'ordine di apertura, così
// Esc chiude solo quello in cima e lo z-index cresce con la profondita'
// (senza, l'ordine nel DOM decide chi sta sopra e il risultato e' casuale).
let modalStack = []

function Modal({ open, onClose, title, size = 'md', children }) {
  const { t } = useT()
  const idRef = useRef({})
  const [depth, setDepth] = useState(0)

  // onClose è quasi sempre una arrow inline: cambia identità a ogni render.
  // Tenerlo in un ref evita che l'effetto si rimonti di continuo.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    modalStack.push(id)
    setDepth(modalStack.length - 1)

    const handleKey = (e) => {
      if (e.key !== 'Escape') return
      // solo il modal in cima reagisce, altrimenti Esc li chiude tutti insieme
      if (modalStack[modalStack.length - 1] !== id) return
      onCloseRef.current?.()
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      modalStack = modalStack.filter((x) => x !== id)
    }
  }, [open])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'obt-modal--sm' : size === 'lg' ? 'obt-modal--lg' : ''

  return (
    <div className="obt-modal-overlay" style={{ zIndex: 1000 + depth * 10 }}>
      <div className={`obt-modal ${sizeClass}`}>
        <div className="obt-modal-head">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="obt-modal-close" onClick={onClose} aria-label={t('common.close')} title={t('common.closeEsc')}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal