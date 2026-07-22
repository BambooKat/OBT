import { useEffect, useRef } from 'react'
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
function Modal({ open, onClose, title, size = 'md', children }) {
  const { t } = useT()

  // onClose è quasi sempre una arrow inline: cambia identità a ogni render.
  // Tenerlo in un ref evita che l'effetto si rimonti di continuo.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.() }
    window.addEventListener('keydown', handleKey)

    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'obt-modal--sm' : size === 'lg' ? 'obt-modal--lg' : ''

  return (
    <div className="obt-modal-overlay">
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