// src/pages/News.jsx
// Pagina Novità. Lettura pubblica per tutti; per l'admin, gestione inline:
//   - "+ News" in alto a destra apre il form di creazione
//     (titolo/testo IT+EN, toolbar markdown, pinned, Pubblica/Salva bozza/Anteprima)
//   - ingranaggio su ogni annuncio → modifica titolo/testo + Elimina
//     (una volta pubblicato non si rimette in bozza: si edita solo il contenuto)
// Testo bilingue con fallback IT↔EN. Aprendo la pagina segna "letto".

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useT } from '../i18n'
import { Markdown, MarkdownToolbar } from './markdown'
import { fetchPublishedAnnouncements, markRead } from './newsUtils'
import { useIsAdmin } from './useIsAdmin'
import { useConfirm } from './ConfirmDialog'

const pick = (a, field, lang) => {
  const primary = a[`${field}_${lang}`]
  if (primary && primary.trim()) return primary
  const other = lang === 'it' ? a[`${field}_en`] : a[`${field}_it`]
  return other || ''
}

const EMPTY = { title_it: '', title_en: '', body_it: '', body_en: '', pinned: false }

export default function News() {
  const { t, lang, formatDate } = useT()
  const { isAdmin } = useIsAdmin()
  const { confirm, dialog } = useConfirm()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // form: chiuso | { mode:'new' } | { mode:'edit', id }
  const [form, setForm] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const bodyItRef = useRef(null)
  const bodyEnRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await reload(alive)
      const { data: { user } } = await supabase.auth.getUser()
      markRead(user?.id || null)
    })()
    return () => { alive = false }
  }, [])

  // admin vede anche le bozze; il pubblico solo i pubblicati
  const reload = async (alive = true) => {
    setLoading(true)
    let data
    if (isAdmin) {
      const res = await supabase.from('announcements').select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      data = res.data || []
    } else {
      data = await fetchPublishedAnnouncements()
    }
    if (!alive) return
    setItems(data)
    setLoading(false)
  }

  // ricarica quando sappiamo se è admin (per includere le bozze)
  useEffect(() => { reload() }, [isAdmin])

  const openNew = () => { setDraft(EMPTY); setForm({ mode: 'new' }); setPreview(false); setError('') }
  const openEdit = (a) => {
    setDraft({
      title_it: a.title_it || '', title_en: a.title_en || '',
      body_it: a.body_it || '', body_en: a.body_en || '', pinned: a.pinned,
    })
    setForm({ mode: 'edit', id: a.id })
    setPreview(false); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const closeForm = () => { setForm(null); setDraft(EMPTY); setPreview(false); setError('') }

  const validate = () => {
    if (!draft.title_it.trim() && !draft.title_en.trim()) { setError(t('adminNews.needTitle')); return false }
    if (!draft.body_it.trim() && !draft.body_en.trim()) { setError(t('adminNews.needBody')); return false }
    return true
  }

  const payloadFrom = (publish) => ({
    title_it: draft.title_it.trim() || null,
    title_en: draft.title_en.trim() || null,
    body_it: draft.body_it.trim() || null,
    body_en: draft.body_en.trim() || null,
    pinned: draft.pinned,
    ...(publish !== null ? { is_published: publish } : {}),
  })

  // publish=true → pubblica; false → bozza; (in edit manteniamo lo stato attuale)
  const save = async (publish) => {
    setError('')
    if (!validate()) return
    setSaving(true)
    let error
    if (form.mode === 'new') {
      ;({ error } = await supabase.from('announcements').insert(payloadFrom(publish)))
    } else {
      // in modifica non tocchiamo is_published (una volta pubblicato resta tale)
      ;({ error } = await supabase.from('announcements').update(payloadFrom(null)).eq('id', form.id))
    }
    if (error) { setError(t('adminNews.saveError')); setSaving(false); return }
    setSaving(false)
    closeForm()
    reload()
  }

  const remove = (a) => confirm({
    message: t('adminNews.deleteConfirm'), danger: true,
    onConfirm: async () => {
      const { error } = await supabase.from('announcements').delete().eq('id', a.id)
      if (error) { setError(t('adminNews.saveError')); return }
      if (form?.mode === 'edit' && form.id === a.id) closeForm()
      reload()
    },
  })

  return (
    <>
      <div className="obt-hero">
        <div className="obt-hero-top">
          <div className="obt-hero-back" />
          <div className="obt-hero-title">
            <h1>{t('news.title')}</h1>
            <p className="obt-hero-desc obt-hero-desc--empty">{t('news.hint')}</p>
          </div>
          <div className="obt-hero-info" style={{ background: 'transparent', padding: 0 }}>
            {isAdmin && !form && (
              <button className="obt-btn obt-btn--primary obt-btn--sm" onClick={openNew}>
                <i className="ti ti-plus" /> {t('adminNews.addNews')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="obt-page">
        {error && <div className="obt-alert obt-alert--error">{error}</div>}

        {/* form crea/modifica (solo admin) */}
        {isAdmin && form && (
          <div className="obt-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <button className="obt-btn obt-btn--ghost obt-btn--sm" onClick={closeForm}>
                &larr; {t('adminNews.backToNews')}
              </button>
              <h2 style={{ margin: 0 }}>
                {form.mode === 'new' ? t('adminNews.newTitle') : t('adminNews.editingTitle')}
              </h2>
            </div>

            <div className="obt-row">
              <div className="obt-field">
                <label>{t('adminNews.titleIt')}</label>
                <input className="obt-input" value={draft.title_it}
                  onChange={e => setDraft({ ...draft, title_it: e.target.value })} />
              </div>
              <div className="obt-field">
                <label>{t('adminNews.titleEn')}</label>
                <input className="obt-input" value={draft.title_en}
                  onChange={e => setDraft({ ...draft, title_en: e.target.value })} />
              </div>
            </div>

            <div className="obt-row">
              <div className="obt-field">
                <label>{t('adminNews.bodyIt')}</label>
                <MarkdownToolbar value={draft.body_it} textareaRef={bodyItRef}
                  onChange={v => setDraft({ ...draft, body_it: v })} />
                <textarea ref={bodyItRef} className="obt-textarea" rows={7} value={draft.body_it}
                  onChange={e => setDraft({ ...draft, body_it: e.target.value })}
                  placeholder={t('adminNews.mdHint')} />
              </div>
              <div className="obt-field">
                <label>{t('adminNews.bodyEn')}</label>
                <MarkdownToolbar value={draft.body_en} textareaRef={bodyEnRef}
                  onChange={v => setDraft({ ...draft, body_en: v })} />
                <textarea ref={bodyEnRef} className="obt-textarea" rows={7} value={draft.body_en}
                  onChange={e => setDraft({ ...draft, body_en: e.target.value })}
                  placeholder={t('adminNews.mdHint')} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', margin: '4px 0 14px' }}>
              <input type="checkbox" checked={draft.pinned}
                onChange={e => setDraft({ ...draft, pinned: e.target.checked })} />
              {t('adminNews.pinned')}
            </label>

            <div className="obt-actions">
              {form.mode === 'new' ? (
                <>
                  <button className="obt-btn obt-btn--primary" onClick={() => save(true)} disabled={saving}>
                    {t('adminNews.publish')}
                  </button>
                  <button className="obt-btn obt-btn--secondary" onClick={() => save(false)} disabled={saving}>
                    {t('adminNews.saveDraft')}
                  </button>
                </>
              ) : (
                <button className="obt-btn obt-btn--primary" onClick={() => save(null)} disabled={saving}>
                  {t('common.saveChanges')}
                </button>
              )}
              <button className="obt-btn obt-btn--ghost" onClick={() => setPreview(p => !p)}>
                <i className="ti ti-eye" /> {t('adminNews.preview')}
              </button>
            </div>

            {/* anteprima on-demand di entrambe le lingue */}
            {preview && (
              <div style={{ marginTop: 18, borderTop: '0.5px solid var(--line)', paddingTop: 16 }}>
                <div className="obt-hint" style={{ marginBottom: 10 }}>{t('adminNews.previewHint')}</div>
                <div className="obt-row">
                  {['it', 'en'].map(lg => (
                    <div key={lg} className="obt-field" style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 8 }}>{lg}</div>
                      <h3 style={{ margin: '0 0 8px' }}>{(lg === 'it' ? draft.title_it : draft.title_en) || t('news.untitled')}</h3>
                      <Markdown text={lg === 'it' ? draft.body_it : draft.body_en} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* elenco annunci — nascosto mentre il form è aperto (crei/modifichi) */}
        {!form && (loading ? (
          <div className="obt-loading">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="obt-panel obt-empty">
            <div className="obt-empty-icon"><i className="ti ti-speakerphone" /></div>
            <h3>{t('news.empty')}</h3>
          </div>
        ) : (
          items.map(a => {
            const title = pick(a, 'title', lang)
            const body = pick(a, 'body', lang)
            return (
              <div key={a.id} className="obt-panel">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  {a.pinned && (
                    <span title={t('news.pinned')} style={{ color: 'var(--primary)' }}><i className="ti ti-pin" /></span>
                  )}
                  <h3 style={{ margin: 0 }}>{title || t('news.untitled')}</h3>
                  <span className="obt-text-soft" style={{ fontSize: 12 }}>{formatDate(a.created_at)}</span>
                  {isAdmin && !a.is_published && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--mid-text)', background: 'var(--mid-bg)', padding: '2px 8px', borderRadius: 999 }}>
                      {t('adminNews.draft')}
                    </span>
                  )}
                  {isAdmin && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button className="obt-icon-btn" title={t('common.edit')} onClick={() => openEdit(a)}><i className="ti ti-settings" /></button>
                      <button className="obt-icon-btn obt-icon-btn--danger" title={t('common.delete')} onClick={() => remove(a)}><i className="ti ti-trash" /></button>
                    </span>
                  )}
                </div>
                <Markdown text={body} />
              </div>
            )
          })
        ))}
      </div>

      {dialog}
    </>
  )
}
