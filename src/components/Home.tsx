import { ChevronRight, X } from 'lucide-react'
import { monthKey, thb } from '../lib/game'
import { useEffect, useRef, useState } from 'react'
import { spritePaths, type Pose, type SpriteName } from '../lib/sprites'
import { reducedMotion, usePoseFlash } from '../lib/usePoseFlash'
import { upcoming } from '../lib/calendar'
import type { Game } from '../lib/useGame'
import QuickAdd from '../money/QuickAdd'
import { ACHIEVEMENTS, dayLog, monsters, monthOf, sum, thisMonth, todayISO, weekChallenge, weekStart } from '../money/logic'
import { fmt0 } from '../money/fmt'
import type { MoneyTab } from '../money/MoneyApp'
import type { Money } from '../money/useMoney'
import HeroStage from './HeroStage'
import { Sprite } from './Sprite'
import { GLOBE_MAP, GLOBE_PAL, GLOBE_SHADE, GLOBE_SHADE_PAL } from '../lib/globe'
import { Bar } from './ui'

export type World = 'money' | 'invest'

/** Hero's lodge: who you are, how each part of your money is doing, and the doors into both worlds. */
export default function Home({ game, money, onGo, onHero }: { game: Game; money: Money; onGo: (w: World, tab?: MoneyTab) => void; onHero: () => void }) {
  const { s, stats, t } = game
  const p = s.profile
  const { db, summary, rest } = money

  const today = todayISO(), m = thisMonth()
  const plan = db.months[m]?.plan ?? []
  const planned = sum(plan)
  const day = planned > 0 ? dayLog(db, m, planned).find(d => d.date === today) : undefined
  const outs = db.entries.filter(e => e.type === 'out' && monthOf(e) === m)
  const mobs = monsters(plan, n => sum(outs.filter(e => e.env === n)))
  const enraged = mobs.filter(x => x.state === 'warn').length, beat = mobs.filter(x => x.state === 'over').length
  const ch = weekChallenge(db, weekStart(today), rest, today)
  const badges = summary.rewards.filter(r => r.kind === 'ach').length
  const bossDown = s.bossDefeated === monthKey()
  // the hero's body shows how today's budget is going
  const mood: { pose: Pose; text?: string } = !day ? { pose: 'idle' }
    : day.hp < 0 ? { pose: 'sit', text: t.home.moodSit(fmt0(-day.hp)) }
    : day.hp < day.max * 0.3 ? { pose: 'tired', text: t.home.moodTired(fmt0(day.hp)) }
    : ch.done ? { pose: 'cheer', text: t.home.moodCheer }
    : { pose: 'idle' }
  // every logged expense is a hit; crossing below 0 knocks the hero down (then the resting pose is 'sit')
  const [flash, play] = usePoseFlash()
  const prevHp = useRef(day?.hp)
  useEffect(() => {
    if (day && prevHp.current !== undefined && day.hp < prevHp.current) play('hurt', 900)
    prevHp.current = day?.hp
  }, [day?.hp]) // eslint-disable-line react-hooks/exhaustive-deps
  // worlds live behind a small button on the card (phones have the taskbar; this keeps the lodge short)
  const [picking, setPicking] = useState(false)
  useEffect(() => {
    if (!picking) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPicking(false)
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [picking])
  // entering a world: the hero walks off first (timer dropped if the taskbar takes us elsewhere meanwhile)
  const walkOff = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(walkOff.current), [])
  const enter = (w: World, tab?: MoneyTab) => {
    setPicking(false)
    if (reducedMotion()) return onGo(w, tab)
    play('walk', 800)
    clearTimeout(walkOff.current)
    walkOff.current = setTimeout(() => onGo(w, tab), 750)
  }
  const soon = upcoming(today, 45, money.payday)
  const next = soon.find(e => e.kind !== 'payday') ?? soon[0]
  const sale = soon.find(e => e.kind === 'sale' && e.inDays <= 3)
  const watch = game.alerts.filter(a => a.level !== 'info')
  const alerts = [
    ...(watch.length ? [{ text: `🔔 ${t.alerts.home(watch.length, t.alerts.head(watch[0]))}`, tone: watch[0].level === 'bad' ? 'text-red-700' : 'text-amber-800', go: true }] : []),
    ...(sale ? [{ text: sale.inDays === 0 ? t.cal.saleToday(t.cal.names[sale.id]) : t.cal.saleSoon(t.cal.names[sale.id], sale.inDays), tone: 'text-violet-700' }] : []),
    ...(day && day.hp < 0 ? [{ text: t.home.hurt(fmt0(-day.hp)), tone: 'text-red-700' }] : []),
    ...(beat || enraged ? [{ text: t.home.mobs(enraged, beat), tone: beat ? 'text-red-700' : 'text-amber-800' }] : []),
    ...(!bossDown && stats.mpMax > 0 ? [{ text: t.home.bossUp, tone: 'text-slate-400' }] : []),
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* the daily thing, one step from opening the app */}
      <section>
        <h2 className="mb-1.5 font-rpg text-sm text-slate-300">{t.home.quick}</h2>
        <QuickAdd money={money} t={t} onToday />
      </section>

      {/* one character card: the hero in their scene + every stat that matters today */}
      <section className="bevel grid overflow-hidden bg-slate-900 sm:grid-cols-2">
        <div className="relative">
          <button onClick={onHero} className="relative block w-full text-left" aria-label={t.home.heroInfo}>
            <HeroStage s={s} pose={flash ?? mood.pose} caption={flash === 'walk' ? undefined : mood.text} />
            <span className="absolute right-2 bottom-2 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 text-[10px] text-retro-cream">
              {t.home.heroInfo} <ChevronRight size={12} />
            </span>
          </button>
          <button onClick={() => setPicking(true)} aria-haspopup="dialog"
            className="btn btn-primary absolute bottom-2 left-2 flex items-center gap-1 !px-1.5 !py-1 text-xs shadow-[2px_2px_0_#0a0c24]">
            <Sprite name="map" size={20} className="animate-idle" /> {t.home.pick}
          </button>
        </div>

        <div className="space-y-2.5 p-3">
          <button onClick={onHero} className="block w-full text-left">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate font-rpg text-xl text-slate-100">{p.name}</span>
              <span className="flex shrink-0 items-center gap-1 font-rpg text-sm text-amber-700"><Sprite name="coin" size={16} /> {s.gold.toLocaleString()}</span>
            </span>
            {s.title && <span className="block text-xs font-semibold text-violet-700">« {t.shop.items[s.title]} »</span>}
            <span className="block text-xs text-slate-400">{t.ranks[stats.rank]} · {t.jobs[p.job ?? 'salaried'].name}</span>
            <span className="mt-1 flex items-center gap-2">
              <span className="bevel grid size-8 shrink-0 place-items-center bg-retro-gold font-rpg text-[#0a0c24]">{stats.level}</span>
              <span className="min-w-0 flex-1">
                <Bar value={stats.exp - stats.levelFloor} max={stats.levelCeil - stats.levelFloor} color="bg-amber-500" className="h-2.5" />
                <span className="mt-0.5 block text-[10px] text-slate-500">EXP {stats.exp.toLocaleString()}</span>
              </span>
            </span>
          </button>

          {/* the 4 gauges; each one opens where you'd act on it */}
          <div className="space-y-1.5 border-t border-slate-800 pt-2">
            <Gauge icon="heart" label={t.home.todayHp} onClick={() => onGo('money', 'log')}
              value={day ? fmt0(day.hp) : '—'} tone={!day || day.hp >= 0 ? 'text-emerald-700' : 'text-red-700'}
              bar={day ? [Math.max(0, day.hp), day.max] : [0, 1]} color={day && day.hp < day.max * 0.3 ? 'bg-red-600' : 'bg-emerald-600'} />
            <Gauge icon="potion" label={t.home.mp} onClick={() => onGo('invest')}
              value={thb(stats.mp)} tone="text-blue-700" bar={[stats.mp, stats.mpMax]} color="bg-blue-600" />
            <Gauge icon="scroll" label={`${t.home.weekly} · ${t.adv.ch[ch.id][0]}`} onClick={() => onGo('money', 'adv')}
              value={`${ch.n}/${ch.goal}`} tone={ch.done ? 'text-emerald-700' : 'text-slate-200'} bar={[ch.n, ch.goal]} color={ch.done ? 'bg-amber-500' : 'bg-violet-500'} />
            <Gauge icon="shield" label={t.home.reserve} onClick={onHero}
              value={t.home.months(stats.monthsCovered.toFixed(1), stats.hpMonths)} tone="text-red-700"
              bar={[stats.monthsCovered, stats.hpMonths]} color="bg-red-600" />
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 font-rpg text-xs text-slate-300">
            <span>STR <b className="text-amber-700">{stats.str}</b></span>
            <span>DEF <b className="text-emerald-700">{stats.def}</b></span>
            <span>INT <b className="text-blue-700">{stats.int}</b></span>
            <span className="flex items-center gap-0.5"><Sprite name="flame" size={16} /> {summary.streak}</span>
            <span className="flex items-center gap-0.5"><Sprite name="medal" size={16} /> {badges}/{ACHIEVEMENTS.length}</span>
          </div>

          {next && (
            <p className="border-t border-slate-800 pt-2 text-[11px] text-slate-300" title={t.cal.hint[next.kind === 'holiday' ? next.id : next.kind]}>
              📅 {t.cal.next(next.icon, t.cal.names[next.id], next.inDays)}
              {t.cal.hint[next.kind === 'holiday' ? next.id : next.kind] && <span className="block text-[10px] text-slate-500">{t.cal.hint[next.kind === 'holiday' ? next.id : next.kind]}</span>}
            </p>
          )}

          {/* only when something needs attention */}
          {alerts.length > 0 && (
            <ul className="space-y-0.5 border-t border-slate-800 pt-2 text-[11px]">
              {alerts.map(a => <li key={a.text} className={a.tone}>{'go' in a ? <button className="text-left hover:underline" onClick={() => enter('invest')}>{a.text} ›</button> : <>⚠ {a.text}</>}</li>)}
            </ul>
          )}
        </div>
      </section>

      {/* doors into the two worlds, opened from the button on the character card */}
      {picking && (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#0a0c24]/90 p-4 backdrop-blur-sm" onClick={() => setPicking(false)}>
          <div role="dialog" aria-modal="true" aria-label={t.home.pickTitle} className="w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between font-rpg text-lg text-retro-cream">
              {t.home.pickTitle}
              <button className="btn px-1.5 py-1" onClick={() => setPicking(false)} aria-label={t.home.close} autoFocus><X size={16} /></button>
            </div>
            <WorldGlobe t={t} onPick={enter} status={{
              money: day ? `${t.home.todayHp} ${fmt0(day.hp)} · ${t.home.mobs(enraged, beat)}` : t.home.noPlan,
              invest: `${thb(stats.netWorth)} · ${bossDown ? t.home.bossDown : t.home.bossUp}`,
            }} />
          </div>
        </div>
      )}

    </div>
  )
}

// the planet's pixel disc, as one clip path
const DISC = Object.values(spritePaths(GLOBE_SHADE.map(r => r.replace(/[^.]/g, 'm')), { m: '#000' }))[0]
const MAP = Object.entries(spritePaths(GLOBE_MAP, GLOBE_PAL))
const SHADE = Object.entries(spritePaths(GLOBE_SHADE, GLOBE_SHADE_PAL))
const MAP_W = GLOBE_MAP[0].length

/** Pixel Earth that slowly turns: the wrap-around map scrolls inside the disc (two copies side by side). */
function PixelPlanet() {
  return (
    <svg viewBox={`0 0 ${GLOBE_SHADE.length} ${GLOBE_SHADE.length}`} className="pixel absolute inset-0 size-full drop-shadow-[0_0_10px_#4cc2ff88]" aria-hidden>
      <defs><clipPath id="planet-disc"><path d={DISC} /></clipPath></defs>
      <g clipPath="url(#planet-disc)">
        <g className="animate-planet">
          {[0, MAP_W].map(x => <g key={x} transform={`translate(${x} 0)`}>{MAP.map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}</g>)}
        </g>
        {/* the two worlds: a gold wash on the money half, a mana wash on the investing half, gold seam between */}
        <rect width="20" height="40" fill="#f6c945" opacity="0.12" />
        <rect x="20" width="20" height="40" fill="#4cc2ff" opacity="0.1" />
        <rect x="19.5" width="1" height="40" fill="#f6c945" />
      </g>
      {SHADE.map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
    </svg>
  )
}

/** The world picker: one pixel globe, the left half is the money world, the right half the investing world. */
function WorldGlobe({ t, status, onPick }: { t: Game['t']; status: Record<World, string>; onPick: (w: World) => void }) {
  const half = (w: World, side: 'l' | 'r', sprites: SpriteName[]) => (
    <button onClick={() => onPick(w)} aria-label={`${t.home.enter}: ${t.home.worlds[w].name}`}
      className={`group relative flex h-full flex-col items-center justify-center gap-2 hover:bg-white/10 focus-visible:bg-white/10 ${side === 'l' ? 'pl-4' : 'pr-4'}`}>
      <span className="flex flex-wrap items-end justify-center gap-1 px-2">
        {sprites.map((n, i) => <Sprite key={n} name={n} size={i === 0 ? 44 : 28} className={i === 0 ? 'animate-idle' : ''} />)}
      </span>
      <span className="bg-[#0a0c24]/75 px-1.5 font-rpg text-base leading-tight text-white sm:text-lg">{t.modes[w]}</span>
      <span className="btn btn-primary !px-2 !py-0.5 text-[11px] group-hover:brightness-110">{t.home.enter} ›</span>
    </button>
  )
  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
        <PixelPlanet />
        <div className="absolute inset-[3%] grid grid-cols-2 overflow-hidden rounded-full">
          {half('money', 'l', ['pouch', 'coin', 'slime'])}
          {half('invest', 'r', ['castle', 'gem', 'dragon'])}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        {(['money', 'invest'] as const).map(w => (
          <p key={w} className={`bevel bg-slate-900 px-2 py-1.5 ${w === 'invest' ? 'text-right' : ''}`}>
            <span className="block font-semibold text-slate-100">{t.home.worlds[w].name}</span>
            <span className="block text-slate-500">{t.home.worlds[w].desc}</span>
            <span className="block text-slate-300">{status[w]}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

function Gauge({ icon, label, value, tone, bar, color, onClick }: {
  icon: SpriteName; label: string; value: string; tone: string; bar: [number, number]; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 text-left hover:bg-slate-800/40">
      <Sprite name={icon} size={16} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate text-slate-400">{label}</span><b className={`shrink-0 font-mono ${tone}`}>{value}</b>
        </span>
        <Bar value={bar[0]} max={bar[1]} color={color} className="h-2" />
      </span>
      <ChevronRight size={14} className="shrink-0 text-slate-600" />
    </button>
  )
}
