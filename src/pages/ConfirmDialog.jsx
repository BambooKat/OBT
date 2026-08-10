// src/pages/ConfirmDialog.jsx
// Dialog di conferma in stile OBT, centrato — rimpiazza window.confirm().
// Uso via hook per comodità:
//   const { confirm, dialog } = useConfirm()
//   ... onClick={() => confirm({ message, onConfirm })}
//   ... {dialog}  // renderizzato una volta nella pagina

import { useState, useCallback } from 'react'
import Modal from './Modal'
import { useT } from '../i18n'

export function useConfirm() {
  const { t } = useT()
  const [state, setState] = useState(null) // { message, danger, confirmLabel, onConfirm }

  const confirm = useCallback((opts) => setState(opts), [])
  const close = () => setState(null)

  const dialog = (
    <Modal open={!!state} onClose={close} title={state?.title || t('common.confirm')} size="sm">
      {state && (
        <>
          <p style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' }}>
            {state.message}
          </p>
          <div className="obt-actions" style={{ marginTop: 18 }}>
            <button
              className={`obt-btn ${state.danger ? 'obt-btn--danger' : 'obt-btn--primary'}`}
              onClick={() => { state.onConfirm?.(); close() }}
            >
              {state.confirmLabel || (state.danger ? t('common.delete') : t('common.confirm'))}
            </button>
            <button className="obt-btn obt-btn--ghost" onClick={close}>{t('common.cancel')}</button>
          </div>
        </>
      )}
    </Modal>
  )

  return { confirm, dialog }
}
