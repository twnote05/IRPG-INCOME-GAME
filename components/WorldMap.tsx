import { motion } from 'framer-motion'
import { Castle, Gem, Globe, Map as MapIcon, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import type { Realm } from '../types'
import { HORIZONS, REALM_KEYS, byHorizon, realmHex, signed, thb } from '../lib/game'
import type { Dict } from '../lib/i18n'
import type { Game } from '../lib/useGame'
import { Panel } from './ui'
import { PixelRing } from '../money/charts'

const REALM_ICON = { domestic: Castle, international: Globe, alternative: Gem, cash: Wallet }
const REALM_TILE: Record<Realm, string> = {
  domestic: 'bg-amber-500/10 border-amber-700/50',
  international: 'bg-blue-500/10 border-blue-700/50',
  alternative: 'bg-purple-500/10 border-purple-700/50',
  cash: 'bg-emerald-500/10 border-emerald-700/50',
}

export default function WorldMap({ game }: { game: Game }) {
  const { s, stats, t, dark } = game
  const up = stats.gain >= 0
  const data = REALM_KEYS.map(r => ({ name: t.realms[r].name, value: stats.byRealm[r], fill: realmHex(r, dark) })).filter(d => d.value > 0)

  return (
    <Panel title={t.map.title} icon={MapIcon} glow="mana">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Summary label={t.map.value} value={thb(stats.totalValue)} />
        <Summary label={t.map.invested} value={thb(stats.totalInvested)} />
        <Summary label={t.map.gain} value={signed(stats.gain, thb)} tone={up ? 'text-emerald-700' : 'text-red-700'} />
        <Summary label={t.map.ret} value={signed(stats.gainPct, n => n.toFixed(2) + '%')} tone={up ? 'text-emerald-700' : 'text-red-700'}
          icon={up ? TrendingUp : TrendingDown} />
      </div>

      <HorizonBar t={t} groups={byHorizon(s.assets)} total={stats.totalValue} />

      <CampaignPath t={t} foreignPct={stats.foreignPct} target={stats.targetForeign} level={stats.level} hasEquity={stats.equity > 0} />

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="grid grid-cols-2 gap-2">
          {REALM_KEYS.map((r, i) => {
            const Icon = REALM_ICON[r]
            const assets = s.assets.filter(a => a.realm === r)
            const value = stats.byRealm[r]
            const inv = assets.reduce((sum, a) => sum + a.invested, 0)
            const pct = stats.totalValue > 0 ? (value / stats.totalValue) * 100 : 0
            return (
              <motion.div key={r} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className={`relative overflow-hidden border p-2.5 sm:p-3 ${REALM_TILE[r]}`}>
                <Icon className="absolute -right-2 -bottom-2 opacity-10" size={72} />
                <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight" style={{ color: realmHex(r, dark) }}>
                  <Icon size={16} className="shrink-0" /> {t.realms[r].name}
                </div>
                <div className="text-[10px] text-slate-400">{t.realms[r].places}</div>
                <div className="mt-2 font-mono text-sm font-bold text-slate-100 sm:text-base">{thb(value)}</div>
                <div className="flex gap-2 text-[11px]">
                  <span className="text-slate-400">{pct.toFixed(1)}%</span>
                  {inv > 0 && <span className={value >= inv ? 'text-emerald-700' : 'text-red-700'}>{signed(((value - inv) / inv) * 100, n => n.toFixed(1) + '%')}</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {assets.length === 0 && <span className="text-[10px] text-slate-600">{t.map.unexplored}</span>}
                  {assets.map(a => <span key={a.id} className="bg-slate-950/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{a.symbol}</span>)}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid place-items-center">
          {data.length === 0 ? <div className="py-10 text-sm text-slate-500">{t.map.empty}</div> : (
            <PixelRing size="size-52" label={t.map.realms} slices={data.map(d => ({ label: d.name, value: d.value, color: d.fill }))}
              center={<div><div className="text-[10px] tracking-widest text-slate-500 uppercase">{t.map.realms}</div><div className="font-rpg text-2xl text-slate-100">{data.length}/4</div></div>} />
          )}
        </div>
      </div>
    </Panel>
  )
}

const HZ_COLOR = { short: 'bg-amber-500', medium: 'bg-blue-600', long: 'bg-emerald-600', unset: 'bg-slate-600' }

function HorizonBar({ t, groups, total }: { t: Dict; groups: ReturnType<typeof byHorizon>; total: number }) {
  if (!total) return null
  const keys = [...HORIZONS, 'unset' as const].filter(k => groups[k].count)
  return (
    <div className="mt-3 border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-1.5 text-[11px] font-semibold text-slate-300">{t.horizonTitle}</div>
      <div className="track flex h-3 overflow-hidden">
        {keys.map(k => <div key={k} className={HZ_COLOR[k]} style={{ width: `${groups[k].value / total * 100}%` }} title={t.horizons[k].name} />)}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {keys.map(k => {
          const g = groups[k]
          return (
            <div key={k} className="text-[11px]" title={t.horizons[k].hint}>
              <div className="flex items-center gap-1 text-slate-300"><span className={`size-2 ${HZ_COLOR[k]}`} />{t.horizons[k].name}</div>
              <div className="font-mono text-slate-100">{thb(g.value)} <span className="text-slate-500">{(g.value / total * 100).toFixed(0)}%</span></div>
              {g.invested > 0 && <div className={g.value >= g.invested ? 'text-emerald-700' : 'text-red-700'}>{signed((g.value - g.invested) / g.invested * 100, n => n.toFixed(1) + '%')}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Guide: start Thai-heavy (80:20 → 70:30), then expand abroad as experience grows. */
function CampaignPath({ t, foreignPct, target, level, hasEquity }: { t: Dict; foreignPct: number; target: number; level: number; hasEquity: boolean }) {
  const drift = foreignPct - target
  const advice = !hasEquity ? t.map.start : drift > 10 ? t.map.tooFar : drift < -10 ? t.map.explore : t.map.onCourse
  return (
    <div className="mt-3 border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-1.5 flex flex-wrap justify-between gap-1 text-[11px]">
        <span className="font-semibold text-slate-300">{t.map.campaign}</span>
        <span className="text-slate-400">{t.map.status(`${Math.round(100 - foreignPct)}:${Math.round(foreignPct)}`, level, `${100 - target}:${target}`)}</span>
      </div>
      <div className="track relative h-2.5 overflow-hidden bg-blue-500/70">
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${hasEquity ? 100 - foreignPct : 0}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-slate-100" style={{ left: `${100 - target}%` }} title={t.map.target} />
      </div>
      <div className={`mt-1.5 text-[11px] ${Math.abs(drift) > 10 ? 'text-amber-800' : 'text-emerald-700'}`}>{advice}</div>
    </div>
  )
}

function Summary({ label, value, tone = 'text-slate-100', icon: Icon }: { label: string; value: string; tone?: string; icon?: typeof Globe }) {
  return (
    <div className="border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="text-[10px] tracking-wider text-slate-500 uppercase">{label}</div>
      <div className={`flex items-center gap-1 font-mono text-sm font-bold ${tone}`}>{Icon && <Icon size={14} />}{value}</div>
    </div>
  )
}
