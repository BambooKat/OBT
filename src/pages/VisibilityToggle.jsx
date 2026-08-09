// src/pages/VisibilityToggle.jsx
// Controllo di visibilità riusabile, un solo concetto in tutto il sito.
//
// Stati (enum lato DB): 'private' | 'unlisted' | 'public'
//   private  -> "Privato": solo tu.
//   unlisted -> "Linkabile": chi ha il link lo apre (anche anon), non ricercabile.
//   public   -> riservato al futuro (vetrina navigabile). Oggi NON raggiungibile da qui.
//
// La UI di oggi mostra DUE soli segmenti (Privato / Linkabile). Il terzo stato
// esiste solo nello schema: quando ci sarà la vetrina, si aggiunge qui il segmento
// e tutto il sito si allinea, perché il componente è uno solo.
//
// Due dimensioni:
//   variant="compact"  -> per le intestazioni: solo i due segmenti.
//   variant="full"     -> per i form/opzioni: segmenti + hint + riga link da copiare.
//
// Props:
//   value: 'private' | 'unlisted' | 'public'
//   onChange: (next) => void      // riceve 'private' o 'unlisted'
//   variant: 'compact' | 'full'   (default 'full')
//   shareUrl: string              // mostrato nella variante full quando non privato
//   disabled: boolean

import { useState } from 'react'
import { useT } from '../i18n'

// 'public' dallo schema futuro: finché non c'è la vetrina, in UI si comporta
// come 'unlisted' (segmento "Linkabile" attivo).
const isShared = (v) => v === 'unlisted' || v === 'public'

export default function VisibilityToggle({
  value,
  onChange,
  variant = 'full',
  shareUrl = '',
  disabled = false,
}) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const shared = isShared(value)

  const copy = async () => {
    if (!shareUrl) return
    try { await navigator.clipboard.writeText(shareUrl) }
    catch { window.prompt(t('visibility.copyPrompt'), shareUrl); return }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const Segment = ({ active, icon, label, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', fontSize: 13, fontWeight: 700,
        fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
        border: 'none', background: active ? 'var(--primary)' : 'transparent',
        color: active ? '#fff' : 'var(--ink-soft)',
        opacity: disabled ? 0.55 : 1, transition: 'background .12s',
      }}
    >
      <i className={`ti ti-${icon}`} /> {label}
    </button>
  )

  const segments = (
    <div style={{
      display: 'inline-flex', borderRadius: 999, overflow: 'hidden',
      border: '1px solid var(--line)', background: 'var(--card)',
    }}>
      <Segment
        active={!shared}
        icon="lock"
        label={t('visibility.private')}
        onClick={() => onChange('private')}
      />
      <Segment
        active={shared}
        icon="link"
        label={t('visibility.unlisted')}
        onClick={() => onChange('unlisted')}
      />
    </div>
  )

  if (variant === 'compact') return segments

  // variant full
  return (
    <div>
      {segments}
      <p className="obt-hint" style={{ marginTop: 8 }}>
        {shared ? t('visibility.unlistedHint') : t('visibility.privateHint')}
      </p>
      {shared && shareUrl && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="obt-input"
            value={shareUrl}
            readOnly
            onFocus={e => e.target.select()}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <button
            type="button"
            className="obt-btn obt-btn--ghost obt-btn--sm"
            onClick={copy}
            style={{ whiteSpace: 'nowrap' }}
          >
            {copied ? t('visibility.copied') : t('common.copy')}
          </button>
        </div>
      )}
    </div>
  )
}
