import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import en from './en'
import it from './it'

// ---------------------------------------------------------------------------
// PER AGGIUNGERE UNA LINGUA:
//   1. copia src/i18n/en.js in src/i18n/xx.js e traduci i valori
//   2. importalo qui sopra
//   3. aggiungi una riga a LANGUAGES qui sotto
// Fine. Lo switcher nell'header si aggiorna da solo.
// Le chiavi mancanti ricadono automaticamente sull'inglese.
// ---------------------------------------------------------------------------
export const LANGUAGES = {
  en: { label: 'English',  flag: 'EN' },
  it: { label: 'Italiano', flag: 'IT' },
}

export const DEFAULT_LANG = 'en'
const STORAGE_KEY = 'obt.lang'

const I18nContext = createContext(null)

// Legge una chiave puntata ("project.tabs.pairs") dentro un oggetto annidato.
const lookup = (dict, key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)

// Sceglie la lingua iniziale: preferenza salvata > lingua del browser > default.
const detectLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LANGUAGES[saved]) return saved
  } catch {
    // localStorage può essere bloccato (Safari in privata): non è un problema.
  }
  const browser = (navigator.language || '').slice(0, 2).toLowerCase()
  return LANGUAGES[browser] ? browser : DEFAULT_LANG
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang)

  const setLang = useCallback((next) => {
    if (!LANGUAGES[next]) return
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignora */ }
  }, [])

  // Tiene allineato <html lang="..."> per screen reader e SEO.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => {
    const dict = LANGUAGES[lang]?.dict || en

    // t('chiave') -> stringa
    // t('chiave', { count: 3 }) -> plurale, se la voce ha { one, other }
    // t('chiave', { name: 'Kat' }) -> interpola {name}
    const t = (key, vars) => {
      let entry = lookup(dict, key)
      if (entry == null) entry = lookup(en, key) // fallback all'inglese
      if (entry == null) {
        console.warn(`[i18n] chiave mancante: ${key}`)
        return key
      }
      if (entry && typeof entry === 'object' && vars && typeof vars.count === 'number') {
        entry = vars.count === 1 ? entry.one : entry.other
      }
      if (typeof entry !== 'string') return key
      if (!vars) return entry
      return entry.replace(/\{(\w+)\}/g, (match, name) =>
        vars[name] != null ? String(vars[name]) : match
      )
    }

    const formatDate = (value) => {
      if (!value) return '-'
      const locale = LANGUAGES[lang]?.locale || 'en-GB'
      return new Date(value).toLocaleDateString(locale)
    }

    return { t, lang, setLang, formatDate, languages: LANGUAGES }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT deve stare dentro <I18nProvider>')
  return ctx
}
