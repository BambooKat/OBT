// src/pages/Privacy.jsx
// Informativa privacy. Il testo vive in i18n (it/en), qui c'è solo la struttura.
//
// ATTENZIONE: la sezione "cancellazione" descrive un pulsante self-service.
// Non pubblicare questa pagina finché quel pulsante non esiste davvero.

import { useT } from '../i18n'
import { CONTACT_EMAIL as CONTACT } from '../config'

const Section = ({ title, children }) => (
  <div className="obt-panel">
    <h3 style={{ marginBottom: 10 }}>{title}</h3>
    {children}
  </div>
)

const P = ({ children }) => (
  <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.55 }}>{children}</p>
)

const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer"
    style={{ color: 'var(--primary)', textDecoration: 'none' }}>{children}</a>
)

export default function Privacy() {
  const { t } = useT()
  const mail = <a href={`mailto:${CONTACT}?subject=OBT%20Privacy`}
    style={{ color: 'var(--primary)', textDecoration: 'none' }}>{CONTACT}</a>

  return (
    <>
      <div className="obt-hero">
        <h1>{t('privacy.title')}</h1>
        <div className="obt-hero-sub">{t('privacy.updated')}</div>
      </div>
      <div className="obt-page">

        <Section title={t('privacy.ownerTitle')}>
          <P>{t('privacy.ownerText')} {mail}</P>
        </Section>

        <Section title={t('privacy.dataTitle')}>
          <P>{t('privacy.dataIntro')}</P>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            <li>{t('privacy.dataAccount')}</li>
            <li>{t('privacy.dataContent')}</li>
            <li>{t('privacy.dataTech')}</li>
          </ul>
          <P>{t('privacy.dataNo')}</P>
        </Section>

        <Section title={t('privacy.publicTitle')}>
          <P><strong>{t('privacy.publicText')}</strong></P>
          <P>{t('privacy.publicText2')}</P>
        </Section>

        <Section title={t('privacy.whereTitle')}>
          <P>
            {t('privacy.whereText')} <A href="https://supabase.com/privacy">Supabase</A>{' '}
            {t('privacy.whereText2')} <A href="https://vercel.com/legal/privacy-policy">Vercel</A>.
          </P>
          <P>{t('privacy.whereEu')}</P>
        </Section>

        <Section title={t('privacy.keepTitle')}>
          <P>{t('privacy.keepText')}</P>
        </Section>

        <Section title={t('privacy.rightsTitle')}>
          <P>{t('privacy.rightsText')}</P>
          <P>{t('privacy.rightsDelete')}</P>
          <P>{t('privacy.rightsContact')} {mail}</P>
        </Section>

        <Section title={t('privacy.cookiesTitle')}>
          <P>{t('privacy.cookiesText')}</P>
        </Section>

        <Section title={t('privacy.minorsTitle')}>
          <P>{t('privacy.minorsText')}</P>
        </Section>

        <Section title={t('privacy.changesTitle')}>
          <P>{t('privacy.changesText')}</P>
        </Section>

      </div>
    </>
  )
}
