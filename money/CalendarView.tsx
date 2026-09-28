import { useEffect, useState } from 'react'
import { CalendarDays, Maximize2, Minimize2 } from 'lucide-react'
import { Panel } from '../components/ui'
import { eventsInMonth } from '../lib/calendar'
import type { Dict } from '../lib/i18n'
import { dayLog, sum, todayISO, validRest } from './logic'
import type { Money } from './useMoney'

type Tile = 'good' | 'over' | 'rest' | 'none' | 'future'
const TILE: Record<Tile, string> = {
  good: 'bg-emerald-600/70 text-white',
  over: 'bg-red-600/80 text-white',
  rest: 'bg-blue-600/70 text-white',
  none: 'bg-slate-800/60 text-slate-400',
  future: 'bg-transparent text-slate-500',
}

/** Month as dungeon floor tiles: color = how the day went, icons = festivals, sales, payday, tax. Tap a day to jump to it.
 *  +/− folds it to a one-line tally (like the fuel calculator); open = this week; full screen = whole month as an overlay. */
export default function CalendarView({ money, t }: { money: Money; t: Dict }) {
  const { db, cur, month, rest, payday } = money
  const today = todayISO()
  const rs = validRest(db, rest)
  const days = dayLog(db, cur, sum(month?.plan ?? []), rs)
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
    d.date > today ? 'future' : !d.active ? 'none' : rs.includes(d.date) && !d.spent ? 'rest' : d.hp >= 0 ? 'good' : 'over'
  const nextEv = events.find(e => e.date >= today)
  const jump = (date: string) => {
    setFull(false)
    requestAnimationFrame(() => document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className={full ? 'fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4' : ''} onClick={full ? () => setFull(false) : undefined}>
    <div className={full ? 'mx-auto max-w-xl' : ''} onClick={e => e.stopPropagation()}>
    <Panel title={t.cal.title} icon={CalendarDays} glow="gold" action={<>
      {!full && <button className="btn px-2 py-0.5 text-xs" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? '−' : '+'}</button>}
      <button className="btn px-1.5 py-0.5" onClick={() => setFull(!full)} aria-label={full ? t.cal.collapse : t.cal.expand} title={full ? t.cal.collapse : t.cal.expand}>
        {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </>}>
      {!open && !full ? (
        <p className="flex flex-wrap gap-x-3 text-xs text-slate-400">
          {(['good', 'over', 'rest'] as const).map(k => (
            <span key={k} className="flex items-center gap-1"><span className={`inline-block size-2.5 ${TILE[k]}`} /> {t.cal.legend[k]} {days.filter(d => state(d) === k).length}</span>
          ))}
          {nextEv && <span>{nextEv.icon} {+nextEv.date.slice(8)} {t.cal.names[nextEv.id]}</span>}
        </p>
      ) : <>
      <div className="grid grid-cols-7 gap-1 text-center">
        {t.cal.days.map(d => <div key={d} className="text-[10px] text-slate-500">{d}</div>)}
        {Array.from({ length: pad }, (_, i) => <div key={`x${i}`} />)}
        {shown.map(d => {
          const ev = events.filter(e => e.date === d.date)
          const st = state(d)
          return (
            <button key={d.date} onClick={() => jump(d.date)} title={ev.map(e => t.cal.names[e.id]).join(' · ') || undefined}
              className={`relative flex aspect-square flex-col items-center justify-center border border-black/30 font-rpg text-xs ${TILE[st]} ${d.date === today ? 'outline-2 outline-offset-1 outline-amber-500' : ''}`}>
              <span>{+d.date.slice(8)}</span>
              {ev.length > 0 && <span className="text-[10px] leading-none">{ev.map(e => e.icon).join('')}</span>}
            </button>
          )
        })}
      </div>
      {full && <>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {(['good', 'over', 'rest', 'none'] as const).map(k => (
          <span key={k} className="flex items-center gap-1"><span className={`inline-block size-2.5 ${TILE[k]}`} /> {t.cal.legend[k]}</span>
        ))}
      </div>
      {events.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-slate-800 pt-2 text-[11px]">
          {events.map(e => (
            <li key={e.id + e.date} className="flex gap-2">
              <span className="w-10 shrink-0 font-mono text-slate-500">{+e.date.slice(8)}</span>
              <span className="text-slate-200">{e.icon} {t.cal.names[e.id]}</span>
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
