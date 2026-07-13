import { useEffect } from 'react'
import { useT } from '../i18n'

// Modal riusabile. Si chiude con Esc, con click sull'overlay, o col bottone ✕.
// Usalo per form di creazione/modifica: così quando l'utente naviga via
// (cambio tab, cambio pagina) il form smette semplicemente di esistere
// invece di restare aperto in background.
//
// Props:
//   open: boolean, se mostrare il modal
//   onClose: funzione chiamata alla chiusura
//   title: titolo mostrato in alto
//   size: 'sm' | 'md' | 'lg' (default 'md')
//   children: contenuto del modal (tipicamente un form)
function Modal({ open, onClose, title, size = 'md', children }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    // Blocca lo scroll della pagina sotto mentre il modal è aperto
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'obt-modal--sm' : size === 'lg' ? 'obt-modal--lg' : ''

  return (
    <div
      className="obt-modal-overlay"
      onClick={(e) => {
        // Chiudi solo se si clicca esattamente sull'overlay, non sul contenuto
        if (e.target === e.currentTarget) onClose()
      }}
    >
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