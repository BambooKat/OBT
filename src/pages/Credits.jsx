// src/pages/Credits.jsx
// Pagina crediti: attribuzioni di icone, font e librerie.
//
// COME AGGIUNGERE UN'ICONA:
// aggiungi una riga a GAME_ICONS con il nome dell'autore preso dalla pagina
// della singola icona su game-icons.net. La licenza CC BY 3.0 richiede che
// l'autore sia citato, non solo il sito.

import { useT } from '../i18n'

// --- icone specie da game-icons.net (CC BY 3.0) ---
// { file: nome del file in public/species, species: specie, author: autore }
const GAME_ICONS = [
  { file: 'anura.svg', species: 'Anura', icon: 'Frog', author: 'Lorc' },
  { file: 'avi.svg', species: 'Avi', icon: 'Heron', author: 'Caro Asercion' },
  { file: 'canis.svg', species: 'Canis', icon: 'Labrador head', author: 'Delapouite' },
  { file: 'catus.svg', species: 'Catus', icon: 'Cat', author: 'Lorc' },
  { file: 'cebidae.svg', species: 'Cebidae', icon: 'Monkey', author: 'Lorc' },
  { file: 'cetacea.svg', species: 'Cetacea', icon: 'Dolphin', author: 'Delapouite' },
  { file: 'chiropy.svg', species: 'Chiropy', icon: 'Bat', author: 'Skoll' },
  { file: 'draconis.svg', species: 'Draconis', icon: 'Wyvern', author: 'Lorc' },
  { file: 'equus.svg', species: 'Equus', icon: 'Horse head', author: 'Delapouite' },
  { file: 'ericius.svg', species: 'Ericius', icon: 'Hedgehog', author: 'Caro Asercion' },
  { file: 'feline.svg', species: 'Feline', icon: 'Tiger', author: 'Delapouite' },
  { file: 'gallus.svg', species: 'Gallus', icon: 'Rooster', author: 'Delapouite' },
  { file: 'gekko.svg', species: 'Gekko', icon: 'Gecko', author: 'Lorc' },
  { file: 'gryphus.svg', species: 'Gryphus', icon: 'Griffin symbol', author: 'Delapouite' },
  { file: 'haliaeetus.svg', species: 'Haliaeetus', icon: 'Eagle emblem', author: 'Lorc' },
  { file: 'hyaena.svg', species: 'Hyaena', icon: 'Hyena head', author: 'Caro Asercion' },
  { file: 'lepus.svg', species: 'Lepus', icon: 'Rabbit', author: 'Delapouite' },
  { file: 'loong.svg', species: 'Loong', icon: 'Sea dragon', author: 'Lorc' },
  { file: 'lotor.svg', species: 'Lotor', icon: 'Raccoon head', author: 'Delapouite' },
  { file: 'lupus.svg', species: 'Lupus', icon: 'Wolf head', author: 'Lorc' },
  { file: 'macropus.svg', species: 'Macropus', icon: 'Kangaroo', author: 'Delapouite' },
  { file: 'mantis.svg', species: 'Mantis', icon: 'Praying mantis', author: 'Delapouite' },
  { file: 'mustela.svg', species: 'Mustela', icon: 'Beaver', author: 'Delapouite' },
  { file: 'ovis.svg', species: 'Ovis', icon: 'Goat', author: 'Skoll' },
  { file: 'pacos.svg', species: 'Pacos', icon: 'Camel head', author: 'Delapouite' },
  { file: 'phanta.svg', species: 'Phanta', icon: 'Elephant', author: 'Delapouite' },
  { file: 'piscium.svg', species: 'Piscium', icon: 'Clownfish', author: 'Delapouite' },
  { file: 'porcus.svg', species: 'Porcus', icon: 'Pig', author: 'Skoll' },
  { file: 'psittaco.svg', species: 'Psittaco', icon: 'Parrot head', author: 'Lorc' },
  { file: 'rangifer.svg', species: 'Rangifer', icon: 'Deer', author: 'Caro Asercion' },
  { file: 'raptor.svg', species: 'Raptor', icon: 'Velociraptor', author: 'Delapouite' },
  { file: 'rattus.svg', species: 'Rattus', icon: 'Mouse', author: 'Lorc' },
  { file: 'serpentes.svg', species: 'Serpentes', icon: 'Cobra', author: 'Delapouite' },
  { file: 'slime.svg', species: 'Slime', icon: 'Acid blob', author: 'Lorc' },
  { file: 'struthio.svg', species: 'Struthio', icon: 'Ostrich', author: 'Delapouite' },
  { file: 'taurus.svg', species: 'Taurus', icon: 'Charging bull', author: 'Delapouite' },
  { file: 'testa.svg', species: 'Testa', icon: 'Turtle', author: 'Lorc' },
  { file: 'ursa.svg', species: 'Ursa', icon: 'Bear head', author: 'Delapouite' },
  { file: 'vulpes.svg', species: 'Vulpes', icon: 'Fox', author: 'Caro Asercion' },
]

const Section = ({ title, children }) => (
  <div className="obt-panel">
    <h3 style={{ marginBottom: 10 }}>{title}</h3>
    {children}
  </div>
)

const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer"
    style={{ color: 'var(--primary)', textDecoration: 'none' }}>{children}</a>
)

export default function Credits() {
  const { t } = useT()

  // raggruppa le icone per autore, così l'elenco resta leggibile
  const byAuthor = GAME_ICONS.reduce((acc, i) => {
    (acc[i.author] = acc[i.author] || []).push(i.species)
    return acc
  }, {})

  return (
    <>
      <div className="obt-hero">
        <h1>{t('credits.title')}</h1>
        <div className="obt-hero-sub">{t('credits.subtitle')}</div>
      </div>
      <div className="obt-page">

        <Section title={t('credits.iconsTitle')}>
          <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 10 }}>
            {t('credits.gameIconsIntro')} <A href="https://game-icons.net">game-icons.net</A>,{' '}
            <A href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</A>.
          </p>
          {Object.keys(byAuthor).length === 0 ? (
            <p className="obt-text-soft" style={{ fontSize: 13 }}>{t('credits.none')}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {Object.entries(byAuthor).map(([author, list]) => (
                <li key={author} style={{ marginBottom: 4 }}>
                  <strong>{author}</strong> — {list.join(', ')}
                </li>
              ))}
            </ul>
          )}
          <p className="obt-text-soft" style={{ fontSize: 13, marginTop: 14 }}>
            {t('credits.tablerIntro')} <A href="https://tabler.io/icons">Tabler Icons</A> (MIT).
          </p>
        </Section>

        <Section title={t('credits.fontsTitle')}>
          <p className="obt-text-soft" style={{ fontSize: 13 }}>
            <A href="https://fonts.google.com/specimen/Baloo+2">Baloo 2</A>{' '}
            {t('credits.and')}{' '}
            <A href="https://fonts.google.com/specimen/Nunito">Nunito</A>{' '}
            — <A href="https://openfontlicense.org/">SIL Open Font License 1.1</A>.
          </p>
        </Section>

        <Section title={t('credits.techTitle')}>
          <p className="obt-text-soft" style={{ fontSize: 13 }}>
            <A href="https://react.dev">React</A>, <A href="https://vite.dev">Vite</A>,{' '}
            <A href="https://supabase.com">Supabase</A>, <A href="https://vercel.com">Vercel</A>.
          </p>
        </Section>

        <Section title={t('credits.gameTitle')}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            <A href="https://ovipets.com">OviPets</A> © 2010–2026 IO|HAZE PTE LTD. {t('credits.rightsReserved')}
          </p>
          <p className="obt-text-soft" style={{ fontSize: 13, marginBottom: 8 }}>
            {t('credits.gameText')}
          </p>
          <p className="obt-text-soft" style={{ fontSize: 12 }}>
            {t('credits.disclaimer')}
          </p>
        </Section>

      </div>
    </>
  )
}
