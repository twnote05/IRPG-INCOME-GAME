import { useEffect, useState } from 'react'
import { CalendarDays, Maximize2, Minimize2 } from 'lucide-react'
import { Panel } from '../components/ui'
import { eventsInMonth } from '../lib/calendar'
import type { Dict } from '../lib/i18n'
import { dayTotals, daysInMonth, spendable, todayISO } from './logic'
import type { Money } from './useMoney'

type Tile = 'over' | 'under' | 'none' | 'future'
const TILE: Record<Tile, string> = {
  over: 'bg-(--t-over) text-(--t-fg)',
  under: 'bg-(--t-under) text-(--t-fg)',
  none: 'bg-(--t-none) text-(--t-fg)',
  future: 'bg-transparent text-(--t-future)',
}
/** "over" is also marked without hue: a thick underline, clear of the glyph bottoms. */
const OVER = 'underline decoration-2 underline-offset-2'

/** Compact whole-baht amount that fits a ~44px tile: 850, 1.2k, 12k, 1.2M. */
const short = (v: number) => {
  const n = Math.round(v)
  if (n < 1000) return String(n)
  if (n < 10000) return `${+(n / 1000).toFixed(1)}k`
  const k = Math.round(n / 1000)
  return k < 1000 ? `${k}k` : `${+(k / 1000).toFixed(1)}M`
}

/** Month as day tiles: color + the day's spend as a number = over/under the daily figure; icons = festivals, sales, payday, tax. Tap a day to jump to it.
 *  +/− folds it to a one-line tally (like the fuel calculator); open = this week; full screen = whole month as an overlay. */
export default function CalendarView({ money, t }: { money: Money; t: Dict }) {
  const { db, cur, payday } = money
  const today = todayISO()
  const spent = dayTotals(db, cur)
  const sp = spendable(db, cur, today)
  const days = Array.from({ length: daysInMonth(cur) }, (_, i) => {
    const date = `${cur}-${String(i + 1).padStart(2, '0')}`
    return { date, spent: spent[date] || 0 }
  })
  const events = eventsInMonth(cur, payday)
  const [y, m] = cur.split('-').map(Number)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Monday first
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(false)
  useEffect(() => {
    if (!full) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false)
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [full])
  // minimized: the week holding today (first week if today isn't in this month)
  const ti = Math.max(0, days.findIndex(d => d.date === today))
  const w0 = Math.floor((ti + lead) / 7) * 7 - lead
  const shown = full ? days : days.slice(Math.max(0, w0), w0 + 7)
  const pad = full ? lead : Math.max(0, -w0)

  const state = (d: typeof days[number]): Tile =>
    // No plan, or a plan with nothing left (perDay 0): no daily figure to be over, so a spent day is 'under' (month-level overspend shows on the today card).
    d.date > today ? 'future' : !d.spent ? 'none' : sp.hasPlan && sp.perDay > 0 && d.spent > sp.perDay ? 'over' : 'under'
  const nextEv = events.find(e => e.date >= today)
  const jump = (date: string) => {
    setFull(false)
    requestAnimationFrame(() => document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  // a plain color swatch, not a chip with a number in it: a "12" reads like a real day
  const legend = (k: 'under' | 'over', count?: number) => (
    <span key={k} className="flex items-center gap-1">
      <span aria-hidden className={`inline-block size-3.5 shrink-0 rounded-sm border border-line ${TILE[k]}`} />
      <span className={k === 'over' ? OVER : ''}>{t.cal.legend[k]}</span>
      {count !== undefined && count}
    </span>
  )

  return (
    <div className={full ? 'fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4' : ''} onClick={full ? () => setFull(false) : undefined}>
    <div className={full ? 'mx-auto max-w-xl' : ''} onClick={e => e.stopPropagation()}>
    <Panel title={t.cal.title} icon={CalendarDays} action={<>
      {!full && <button className="btn min-w-11 px-3 text-xs" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? '−' : '+'}</button>}
      <button className="btn min-w-11 px-3" onClick={() => setFull(!full)} aria-label={full ? t.cal.collapse : t.cal.expand} title={full ? t.cal.collapse : t.cal.expand}>
        {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </>}>
      {!open && !full ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {(['under', 'over'] as const).map(k => legend(k, days.filter(d => state(d) === k).length))}
          {nextEv && <span>{nextEv.icon} {+nextEv.date.slice(8)} {t.cal.names[nextEv.id]}</span>}
        </p>
      ) : <>
      <div className="grid grid-cols-7 gap-1 text-center">
        {t.cal.days.map(d => <div key={d} className="text-[10px] text-muted">{d}</div>)}
        {Array.from({ length: pad }, (_, i) => <div key={`x${i}`} />)}
        {shown.map(d => {
          const ev = events.filter(e => e.date === d.date)
          const st = state(d)
          return (
            <button key={d.date} onClick={() => jump(d.date)} title={ev.map(e => t.cal.names[e.id]).join(' · ') || undefined}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-md border border-line font-mono text-xs leading-tight ${TILE[st]} ${d.date === today ? 'outline-2 outline-offset-1 outline-accent' : ''}`}>
              <span>{+d.date.slice(8)}</span>
              {d.spent > 0 && <span className={`text-[11px] ${st === 'over' ? OVER : ''}`}>{short(d.spent)}</span>}
              {ev.length > 0 && <span className="text-[10px] leading-none">{ev.map(e => e.icon).join('')}</span>}
            </button>
          )
        })}
      </div>
      {full && <>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        {(['under', 'over'] as const).map(k => legend(k))}
      </div>
      {events.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px]">
          {events.map(e => (
            <li key={e.id + e.date} className="flex gap-2">
              <span className="w-10 shrink-0 font-mono text-muted">{+e.date.slice(8)}</span>
              <span>{e.icon} {t.cal.names[e.id]}</span>
            </li>
          ))}
        </ul>
      )}
      </>}
      </>}
    </Panel>
    </div>
    </div>
  )
}
