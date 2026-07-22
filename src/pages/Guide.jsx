// src/pages/Guide.jsx
// Guida + glossario. Come Privacy.jsx: qui c'è solo la struttura, il testo vive in i18n.
// Il glossario sta IN CIMA di proposito: serve anche a chi conosce OviPets ma non OBT.

import { useState } from 'react'
import { useT } from '../i18n'

const Section = ({ title, children }) => (
  <div className="obt-panel">
    <h3 style={{ marginBottom: 10 }}>{title}</h3>
    {children}
  </div>
)

const P = ({ children }) => (
  <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.55 }}>{children}</p>
)

// voce di glossario: termine in evidenza + definizione sulla stessa riga
const Term = ({ name, children }) => (
  <div style={{ marginBottom: 10 }}>
    <strong style={{ fontSize: 13 }}>{name}</strong>
    <span className="obt-text-soft" style={{ fontSize: 13, lineHeight: 1.55 }}> — {children}</span>
  </div>
)

export default function Guide({ initialTab = 'guide' }) {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState(initialTab)

  const tabs = ['glossary', 'guide', 'faq']
  const tabLabels = {
    glossary: t('guide.tab.glossary'),
    guide: t('guide.tab.guide'),
    faq: t('guide.tab.faq'),
  }

  return (
    <>
      <div className="obt-hero">
        <h1>{t('guide.title')}</h1>
        <div className="obt-hero-sub">{t('guide.subtitle')}</div>
      </div>
      <div className="obt-page">

        <div className="obt-tabs">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`obt-tab${activeTab === tab ? ' obt-tab--active' : ''}`}>{tabLabels[tab]}</button>
          ))}
        </div>

        {/* ---- GLOSSARIO ---- */}
        {activeTab === 'glossary' && (
        <Section title={t('guide.glossary.title')}>
          <P>{t('guide.glossary.intro')}</P>

          <h4 style={{ margin: '14px 0 8px', fontSize: 13 }}>{t('guide.glossary.groupProject')}</h4>
          <Term name={t('guide.term.project')}>{t('guide.term.projectDef')}</Term>
          <Term name={t('guide.term.target')}>{t('guide.term.targetDef')}</Term>
          <Term name={t('guide.term.generation')}>{t('guide.term.generationDef')}</Term>
          <Term name={t('guide.term.founder')}>{t('guide.term.founderDef')}</Term>

          <h4 style={{ margin: '14px 0 8px', fontSize: 13 }}>{t('guide.glossary.groupId')}</h4>
          <Term name={t('guide.term.name')}>{t('guide.term.nameDef')}</Term>
          <Term name={t('guide.term.code')}>{t('guide.term.codeDef')}</Term>
          <Term name={t('guide.term.slot')}>{t('guide.term.slotDef')}</Term>

          <h4 style={{ margin: '14px 0 8px', fontSize: 13 }}>{t('guide.glossary.groupNumbers')}</h4>
          <Term name={t('guide.term.distance')}>{t('guide.term.distanceDef')}</Term>
          <Term name={t('guide.term.mutCount')}>{t('guide.term.mutCountDef')}</Term>
          <Term name={t('guide.term.floor')}>{t('guide.term.floorDef')}</Term>
          <Term name={t('guide.term.cooldown')}>{t('guide.term.cooldownDef')}</Term>

          <h4 style={{ margin: '14px 0 8px', fontSize: 13 }}>{t('guide.glossary.groupGenetics')}</h4>
          <Term name={t('guide.term.dominance')}>{t('guide.term.dominanceDef')}</Term>
          <Term name={t('guide.term.splice')}>{t('guide.term.spliceDef')}</Term>
          <Term name={t('guide.term.mutation')}>{t('guide.term.mutationDef')}</Term>
        </Section>
        )}

        {/* ---- PERCORSO ---- */}
        {activeTab === 'guide' && (<>
        <Section title={t('guide.step0.title')}>
          <P>{t('guide.step0.a')}</P>
          <P>{t('guide.step0.b')}</P>
        </Section>

        <Section title={t('guide.step1.title')}>
          <P>{t('guide.step1.a')}</P>
          <P>{t('guide.step1.b')}</P>
        </Section>

        <Section title={t('guide.step2.title')}>
          <P>{t('guide.step2.a')}</P>
          <P>{t('guide.step2.b')}</P>
          <P>{t('guide.step2.c')}</P>
        </Section>

        <Section title={t('guide.step3.title')}>
          <P>{t('guide.step3.a')}</P>
          <P>{t('guide.step3.b')}</P>
        </Section>

        <Section title={t('guide.step4.title')}>
          <P>{t('guide.step4.a')}</P>
          <P>{t('guide.step4.b')}</P>
          <P>{t('guide.step4.c')}</P>
        </Section>

        <Section title={t('guide.step5.title')}>
          <P>{t('guide.step5.a')}</P>
          <P>{t('guide.step5.b')}</P>
          <P>{t('guide.step5.c')}</P>
          <P>{t('guide.step5.d')}</P>
        </Section>

        <Section title={t('guide.step6.title')}>
          <P>{t('guide.step6.a')}</P>
          <P>{t('guide.step6.b')}</P>
        </Section>

        <Section title={t('guide.step7.title')}>
          <P>{t('guide.step7.a')}</P>
          <P>{t('guide.step7.b')}</P>
          <P>{t('guide.step7.c')}</P>
        </Section>
        </>)}

        {/* ---- FAQ ---- */}
        {activeTab === 'faq' && (
        <Section title={t('guide.faq.title')}>
          <P><strong>{t('guide.faq.q1')}</strong></P>
          <P>{t('guide.faq.a1')}</P>
          <P><strong>{t('guide.faq.q2')}</strong></P>
          <P>{t('guide.faq.a2')}</P>
          <P><strong>{t('guide.faq.q3')}</strong></P>
          <P>{t('guide.faq.a3')}</P>
          <P><strong>{t('guide.faq.q4')}</strong></P>
          <P>{t('guide.faq.a4')}</P>
          <P><strong>{t('guide.faq.q5')}</strong></P>
          <P>{t('guide.faq.a5')}</P>
        </Section>
        )}

      </div>
    </>
  )
}
