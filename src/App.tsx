import { AnimatePresence, motion } from 'framer-motion'
import { History, Info, Languages, Monitor, Moon, Plus, RotateCcw, Sparkles, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Asset } from './types'
import { thb } from './lib/game'
import { useGame, type Tone } from './lib/useGame'
import AssetAlerts from './components/AssetAlerts'
import AssetTable from './components/AssetTable'
import { PaydayBoss, VolatilityEvent } from './components/BossRaid'
import CharacterSheet from './components/CharacterSheet'
import CompoundSimulator from './components/CompoundSimulator'
import Clock from './components/Clock'
import Home, { type World } from './components/Home'
import Shop from './components/Shop'
import QuestLog from './components/QuestLog'
import TransactionModal from './components/TransactionModal'
import WorldMap from './components/WorldMap'
import { Bar, Panel, TitleBar } from './components/ui'
import MoneyApp, { type MoneyTab } from './money/MoneyApp'
import { Sprite } from './components/Sprite'
import type { SpriteName } from './lib/sprites'
import { useMoney } from './money/useMoney'

const TOAST: Record<Tone, string> = { gold: 'text-amber-700', emerald: 'text-emerald-700', ruby: 'text-red-700', mana: 'text-blue-700' }
const TX_COLOR = { start: 'text-amber-800', buy: 'text-amber-800', deposit: 'text-blue-700', edit: 'text-slate-400', remove: 'text-red-700' }

/** home = hero's lodge (overview + doors), hero = full character page, then the two worlds */
type Mode = 'home' | 'hero' | World
type Tab = 'map' | 'quests' | 'items'
const INVEST_TABS = [
  { id: 'map', icon: 'map' }, { id: 'quests', icon: 'scroll' }, { id: 'items', icon: 'chest' },
] as const
const WORLD_ICON = { money: 'pouch', invest: 'sword' } as const
const MONEY_NAV = [
  { id: 'log', icon: 'book' }, { id: 'adv', icon: 'sword' }, { id: 'plan', icon: 'map' }, { id: 'sum', icon: 'chart' }, { id: 'set', icon: 'gear' },
] as const

export default function App() {
  const money = useMoney()
  const game = useGame(money.summary)
  const { s, stats, toasts, t, dark, lang } = game

  // The app always opens at the hero's lodge; the quick-add there keeps daily logging one step away.
  const [mode, setModeState] = useState<Mode>('home')
  const setMode = (m: Mode) => { setModeState(m); window.scrollTo({ top: 0 }) }
  const world = mode === 'money' || mode === 'invest' ? mode : null
  const [moneyTab, setMoneyTab] = useState<MoneyTab>('log')
  const [modal, setModal] = useState<{ asset?: Asset } | null>(null)
  const [tab, setTab] = useState<Tab>('map')
  // Phones show one tab at a time; from md up every section is visible.
  const show = (...tabs: Tab[]) => (tabs.includes(tab) ? '' : 'max-md:hidden')
  const goTab = (id: Tab) => { setTab(id); window.scrollTo({ top: 0 }) }
  const goMoneyTab = (id: MoneyTab) => { setMoneyTab(id); window.scrollTo({ top: 0 }) }

  // Level-up celebration (skip the initial load)
  const prevLevel = useRef(stats.level)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  useEffect(() => {
    if (stats.level > prevLevel.current) {
      setLevelUp(stats.level)
      const timer = setTimeout(() => setLevelUp(null), 2600)
      prevLevel.current = stats.level
      return () => clearTimeout(timer)
    }
    prevLevel.current = stats.level
  }, [stats.level])

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
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
          <h1>
            <button onClick={() => setMode('home')} className="flex items-center gap-2 font-rpg text-lg tracking-wider sm:text-2xl" aria-label={t.home.back}>
              <Monitor size={22} /> <span className="max-sm:hidden">INVESTOR RPG</span><span className="sm:hidden">IRPG</span>
            </button>
          </h1>

          {mode !== 'home' && (
            <nav className="flex items-center gap-1.5 text-xs sm:text-sm" aria-label="Breadcrumb">
              <button onClick={() => setMode('home')} className="btn flex items-center gap-1 px-2 py-1"><Sprite name="castle" size={16} /> {t.home.back}</button>
              <span className="text-retro-mint">›</span>
              <span className="flex items-center gap-1.5 font-rpg text-retro-gold">
                <Sprite name={world ? WORLD_ICON[world] : 'helmet'} size={16} />
                <span className="max-sm:hidden">{world ? t.home.worlds[world].name : t.home.heroInfo}</span>
                <span className="sm:hidden">{world ? t.modes[world] : t.nav.hero}</span>
              </span>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1.5 md:order-last">
            <Clock lang={lang} />
            <button onClick={game.toggleLang} className="btn flex items-center gap-1 px-2 py-1.5 text-xs" aria-label={t.switchLangAria} title={t.switchLangAria}>
              <Languages size={15} /> <span className="max-sm:hidden">{t.switchLang}</span>
            </button>
            <button onClick={game.toggleTheme} className="btn px-2 py-1.5" aria-label={dark ? t.lightMode : t.darkMode} title={dark ? t.lightMode : t.darkMode}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {mode === 'invest' && <>
              <button onClick={() => confirm(t.resetConfirm) && game.reset()} className="btn px-2 py-1.5" aria-label={t.reset} title={t.reset}>
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setModal({})} className="btn flex items-center gap-1.5 font-bold max-md:hidden">
                <Plus size={16} /> {t.addInvestment}
              </button>
            </>}
          </div>

          {/* the hero follows you into the ledger: level + gold always visible */}
          <div className={`flex items-center gap-3 ${mode === 'invest' ? 'w-full sm:w-auto' : 'max-sm:hidden'}`}>
            <div className="bevel grid size-9 shrink-0 place-items-center bg-retro-gold font-rpg text-lg text-[#0a0c24]" title="Level">{stats.level}</div>
            <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
              <div className="flex justify-between gap-2 text-[10px] text-retro-mint">
                <span>EXP {stats.exp.toLocaleString()}</span><span>Lv {stats.level + 1}</span>
              </div>
              <Bar value={stats.exp - stats.levelFloor} max={stats.levelCeil - stats.levelFloor} color="bg-amber-500" className="h-2.5" />
            </div>
            <div className="flex items-center gap-1 font-rpg text-sm text-retro-gold"><Sprite name="coin" size={16} /> {s.gold.toLocaleString()}</div>
          </div>
          {mode === 'invest' && (
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[10px] tracking-wider text-retro-mint uppercase">{t.netWorth}</div>
                <div className="font-mono text-base font-bold text-white sm:text-lg">{thb(stats.netWorth)}</div>
              </div>
              {game.live.status !== 'off' && (
                <span className="text-[11px] tracking-wider"
                  title={game.live.server.set ? t.live.detail(game.live.server.set, game.live.server.gold ?? '-') : undefined}>
                  {game.live.status === 'live' ? <span className="text-[#7ee0a8]">● {t.live.live}</span>
                    : game.live.status === 'offline' ? <span className="text-[#f5a3a3]">● {t.live.offline}</span>
                      : <span className="text-retro-mint">● {t.live.connecting}</span>}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {mode === 'home' ? (
        <main className="p-3 pb-28 sm:p-4 md:pb-6">
          <Home game={game} money={money} onHero={() => setMode('hero')}
            onGo={(w, tb) => { if (tb) setMoneyTab(tb); setMode(w) }} />
        </main>
      ) : mode === 'hero' ? (
        <main className="mx-auto grid max-w-5xl gap-4 p-3 pb-28 sm:p-4 md:grid-cols-2 md:pb-6"><CharacterSheet game={game} /><Shop game={game} /></main>
      ) : mode === 'money' ? (
        <main className="p-3 pb-28 sm:p-4 md:pb-6">
          <MoneyApp money={money} t={t} lang={lang} tab={moneyTab} setTab={goMoneyTab} />
        </main>
      ) : (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-3 pb-28 sm:p-4 md:pb-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className={`min-w-0 space-y-4 ${show('map', 'items')}`}>
            <div className={`space-y-4 ${show('map')}`}>
              <AssetAlerts game={game} />
              <WorldMap game={game} />
              <CompoundSimulator game={game} />
            </div>
            <div className={show('items')}><AssetTable game={game} onEdit={asset => setModal({ asset })} /></div>
          </div>
          <aside className={`space-y-4 ${show('quests', 'items')}`}>
            <div className={`space-y-4 ${show('quests')}`}>
              <QuestLog game={game} />
              <PaydayBoss game={game} />
              <VolatilityEvent game={game} />
            </div>
            <div className={show('items')}>
              <Panel title={t.recentTx} icon={History} glow="mana">
                <ul className="sunken divide-y divide-slate-800">
                  {s.txs.slice(0, 8).map(tx => (
                    <li key={tx.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <div className="min-w-0">
                        <div className={`truncate ${TX_COLOR[tx.kind]}`}>{tx.sym !== undefined ? t.tx[tx.kind](tx.sym) : tx.label}</div>
                        <div className="text-[10px] text-slate-500">{tx.date}</div>
                      </div>
                      <span className="shrink-0 font-mono text-slate-300">{thb(tx.amount)}</span>
                    </li>
                  ))}
                  {s.txs.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-500">{t.noTx}</li>}
                </ul>
              </Panel>
            </div>
          </aside>
        </main>
      )}

      <footer className="mx-auto max-w-[1500px] px-4 pb-4 max-md:hidden">
        <div className="bg-retro-deep py-1.5 text-center font-rpg text-xs tracking-widest text-retro-cream">{t.footer}</div>
      </footer>

      {/* Phone taskbar — its buttons follow the current menu */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t-2 border-retro-gold bg-retro-deep px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-2px_0_#0a0c24] md:hidden">
        <NavBtn icon="castle" label={t.home.nav} active={mode === 'home'} onClick={() => setMode('home')} />
        {!world ? <>
          <NavBtn icon="helmet" label={t.nav.hero} active={mode === 'hero'} onClick={() => setMode('hero')} />
          <NavBtn icon="pouch" label={t.modes.money} active={false} onClick={() => setMode('money')} />
          <NavBtn icon="sword" label={t.modes.invest} active={false} onClick={() => setMode('invest')} />
        </> : world === 'money'
          ? MONEY_NAV.map(tb => <NavBtn key={tb.id} icon={tb.icon} label={t.money.tabs[tb.id]} active={moneyTab === tb.id} onClick={() => goMoneyTab(tb.id)} />)
          : <>
            {INVEST_TABS.slice(0, 1).map(tb => <NavBtn key={tb.id} icon={tb.icon} label={t.nav[tb.id]} active={tab === tb.id} onClick={() => goTab(tb.id)} />)}
            <button onClick={() => setModal({})} className="btn btn-primary mx-1 -mt-4 grid size-14 shrink-0 place-items-center self-start p-0" aria-label={t.addInvestment}>
              <Plus size={26} />
            </button>
            {INVEST_TABS.slice(1).map(tb => <NavBtn key={tb.id} icon={tb.icon} label={t.nav[tb.id]} active={tab === tb.id} onClick={() => goTab(tb.id)} />)}
          </>}
      </nav>

      <AnimatePresence>
        {modal && <TransactionModal key="modal" t={t} initial={modal.asset} onSave={game.upsertAsset} onClose={() => setModal(null)} />}
      </AnimatePresence>

      <div className="pointer-events-none fixed right-3 bottom-24 left-3 z-50 flex flex-col items-end gap-2 sm:left-auto md:right-4 md:bottom-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map(x => (
            <motion.div key={x.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="bevel flex max-w-full items-center gap-2 bg-slate-900 px-3 py-2 text-sm text-slate-100">
              <Info size={16} className={`shrink-0 ${TOAST[x.tone]}`} /> {x.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {levelUp !== null && (
          <motion.div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.08, 1] }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.4 }}
              className="bevel w-full max-w-80 bg-slate-900">
              <TitleBar title={t.info} />
              <div className="flex items-center gap-4 p-5">
                <Sparkles className="shrink-0 text-amber-700" size={40} />
                <div>
                  <div className="font-rpg text-3xl text-emerald-700">{t.levelUp}</div>
                  <div className="text-sm text-slate-300">{t.levelUpBody(levelUp)}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavBtn({ icon, label, active, onClick }: { icon: SpriteName; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 border-2 text-[11px] ${active ? 'border-retro-gold bg-white/10 font-bold text-retro-gold' : 'border-transparent text-retro-mint'}`}>
      <Sprite name={icon} size={24} className={active ? 'animate-idle' : 'opacity-80'} /> {label}
    </button>
  )
}
