import { BarChart3, Languages, Map as MapIcon, Moon, NotebookPen, Sun, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DICT, type Lang } from './lib/i18n'
import MoneyApp, { MONEY_TABS, type MoneyTab } from './money/MoneyApp'
import { useMoney } from './money/useMoney'

const PREFS_KEY = 'investor-rpg:prefs' // read by the inline script in index.html too
interface Prefs { lang: Lang; theme: 'light' | 'dark' }

function loadPrefs(): Prefs {
  const fallback: Prefs = {
    lang: navigator.language.startsWith('th') ? 'th' : 'en',
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } } catch { return fallback }
}

const TAB_ICON = { log: NotebookPen, plan: MapIcon, sum: BarChart3 } as const

export default function App() {
  const money = useMoney()
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [tab, setTabState] = useState<MoneyTab>('log')
  const t = DICT[prefs.lang]
  const dark = prefs.theme === 'dark'
  const setTab = (id: MoneyTab) => { setTabState(id); window.scrollTo({ top: 0 }) }

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* storage blocked */ }
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.lang = prefs.lang
  }, [prefs])

  const header = useRef<HTMLElement>(null)
  // sticky quick-add in the log sits right under the header, whatever height it wraps to
  useEffect(() => {
    const el = header.current
    if (!el) return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--hdr', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="min-h-dvh">
      <header ref={header} className="sticky top-0 z-30 border-b-2 border-retro-gold bg-retro-deep pt-[env(safe-area-inset-top)] text-retro-cream shadow-[0_2px_0_#0a0c24]">
        <div className="mx-auto flex max-w-3xl items-center gap-x-3 px-3 py-2 sm:px-4">
          <h1 className="flex min-w-0 items-center gap-2 font-rpg text-lg tracking-wider sm:text-2xl">
            <Wallet size={22} className="shrink-0" /> <span className="truncate">{t.appName}</span>
          </h1>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button onClick={() => setPrefs(p => ({ ...p, lang: p.lang === 'th' ? 'en' : 'th' }))}
              className="btn flex min-h-11 items-center gap-1 px-2.5 text-xs" aria-label={t.switchLangAria} title={t.switchLangAria}>
              <Languages size={16} /> <span className="max-sm:hidden">{t.switchLang}</span>
            </button>
            <button onClick={() => setPrefs(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
              className="btn min-h-11 px-3" aria-label={dark ? t.lightMode : t.darkMode} title={dark ? t.lightMode : t.darkMode}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="p-3 pb-28 sm:p-4 md:pb-6">
        <MoneyApp money={money} t={t} lang={prefs.lang} tab={tab} setTab={setTab} />
      </main>

      {/* Phone taskbar — the three money pages; settings lives behind the gear */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t-2 border-retro-gold bg-retro-deep px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-2px_0_#0a0c24] md:hidden">
        {MONEY_TABS.map(id => {
          const Icon = TAB_ICON[id]
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)} aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 border-2 text-[11px] ${active ? 'border-retro-gold bg-white/10 font-bold text-retro-gold' : 'border-transparent text-retro-mint'}`}>
              <Icon size={22} /> {t.money.tabs[id]}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
