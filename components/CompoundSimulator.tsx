import { AlertTriangle, FlaskConical } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SCAM_RETURN_PCT, project, thb } from '../lib/game'
import type { Game } from '../lib/useGame'
import { Panel } from './ui'
import { PX } from '../money/charts'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export default function CompoundSimulator({ game }: { game: Game }) {
  const { stats, s, t } = game
  const [lump, setLump] = useState(Math.round(stats.totalValue / 1000) * 1000)
  const [monthly, setMonthly] = useState(s.profile.monthlyBudget || 5000)
  const [rate, setRate] = useState(7)
  const [years, setYears] = useState(20)
  const data = useMemo(() => project(lump, monthly, rate, years), [lump, monthly, rate, years])
  const end = data[data.length - 1]

  return (
    <Panel title={t.sim.title} icon={FlaskConical} glow="emerald">
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label={t.sim.lump} value={lump} min={0} max={Math.max(1_000_000, lump)} step={5000} onChange={setLump} fmt={thb} />
        <Slider label={t.sim.monthly} value={monthly} min={0} max={100000} step={500} onChange={setMonthly} fmt={thb} />
        <Slider label={t.sim.rate} value={rate} min={0} max={15} step={0.5} onChange={setRate} fmt={t.sim.perYear} />
        <Slider label={t.sim.horizon} value={years} min={1} max={40} step={1} onChange={setYears} fmt={t.sim.years} />
      </div>

      {rate > SCAM_RETURN_PCT && (
        <div className="mt-2 flex items-start gap-2 border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-800">
          <AlertTriangle size={14} className="mt-px shrink-0" /> {t.sim.scam(SCAM_RETURN_PCT)}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label={t.sim.futureValue} value={thb(end.value)} tone="text-amber-800" />
        <Stat label={t.sim.contributed} value={thb(end.contributed)} tone="text-blue-700" />
        <Stat label={t.sim.futureLevel} value={`Lv ${end.level}`} tone="text-emerald-700" />
      </div>

      <GrowthBars data={data} t={t} />
      <p className="mt-1 text-[10px] text-slate-500">{t.sim.note}</p>
    </Panel>
  )
}

function Slider({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string
}) {
  return (
    <label className="block">
      <div className="flex justify-between gap-2 text-xs"><span className="text-slate-400">{label}</span><span className="font-mono text-slate-200">{fmt(value)}</span></div>
      <input type="range" className="mt-1 h-6 w-full" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border border-slate-800 bg-slate-950/50 px-1.5 py-2">
      <div className="text-[10px] leading-tight tracking-wider text-slate-500 uppercase">{label}</div>
      <div className={`font-mono text-xs font-bold break-all sm:text-sm ${tone}`}>{value}</div>
    </div>
  )
}

/** One pixel bar per year: contributed money (blue) with the growth on top (gold); a green tag marks every 10th level reached. Tap a bar to read it. */
function GrowthBars({ data, t }: { data: ReturnType<typeof project>; t: Game['t'] }) {
  const bars = data.slice(1)
  const [pick, setPick] = useState<number | null>(null)
  const sel = bars[Math.min(pick ?? bars.length - 1, bars.length - 1)]
  const top = Math.max(...bars.map(b => b.value), 1)
  const dense = bars.length > 20
  return (
    <div className="mt-3">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-[11px]">
        <b className="font-rpg text-slate-100">{t.sim.yearLabel(sel.year)} · Lv {sel.level}</b>
        <span className="text-slate-400">
          <span className="text-emerald-700">{thb(sel.value)}</span> = <span className="text-blue-700">{thb(sel.contributed)}</span> + <span className="text-amber-800">{thb(sel.value - sel.contributed)}</span>
        </span>
      </div>
      <div className="track relative flex h-44 items-end gap-px px-1 pt-3 sm:h-52" role="img" aria-label={t.sim.title}>
        <span className="absolute top-0.5 left-1 font-mono text-[10px] text-slate-500">{compact.format(top)}</span>
        {bars.map((b, i) => {
          const prev = i ? bars[i - 1].level : data[0].level
          const mile = Math.floor(b.level / 10) > Math.floor(prev / 10) ? Math.floor(b.level / 10) * 10 : 0
          const grow = Math.max(0, b.value - b.contributed)
          return (
            <button key={b.year} onClick={() => setPick(i)} title={`${t.sim.yearLabel(b.year)}: ${thb(b.value)}`} aria-label={`${t.sim.yearLabel(b.year)}: ${thb(b.value)}`}
              className={`relative flex h-full min-w-0 flex-1 flex-col justify-end ${sel === b ? 'bg-amber-500/25' : ''}`}>
              {mile > 0 && <span className="mx-auto mb-0.5 bg-emerald-600 px-0.5 font-mono text-[9px] leading-tight whitespace-nowrap text-white shadow-[0_0_0_1px_#0a0c24]" title={`${t.sim.lvUp} ${mile}`}>{mile}</span>}
              <span className="flex flex-col border border-[#0a0c24]" style={{ height: `${Math.max(2, (b.value / top) * 100)}%` }}>
                <i className={`block bg-amber-500 ${PX}`} style={{ flexGrow: grow }} />
                <i className={`block bg-blue-600 ${PX}`} style={{ flexGrow: b.contributed }} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
        <span>{t.sim.yearTick(bars[0].year)}</span>
        {dense && <span>{t.sim.yearTick(bars[Math.floor(bars.length / 2)].year)}</span>}
        <span>{t.sim.yearTick(bars[bars.length - 1].year)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><i className="size-2.5 border border-[#0a0c24] bg-blue-600" />{t.sim.sContrib}</span>
        <span className="flex items-center gap-1"><i className="size-2.5 border border-[#0a0c24] bg-amber-500" />{t.sim.sGrowth}</span>
        <span className="flex items-center gap-1"><i className="bg-emerald-600 px-0.5 font-mono text-[9px] leading-tight text-white not-italic shadow-[0_0_0_1px_#0a0c24]">10</i>{t.sim.lvUp}</span>
        <span className="ml-auto text-slate-500">{t.sim.pick}</span>
      </div>
    </div>
  )
}
