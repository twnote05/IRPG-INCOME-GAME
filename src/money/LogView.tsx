import { CalendarDays, NotebookPen, X } from 'lucide-react'
import { useMemo } from 'react'
import QuickAdd from './QuickAdd'
import CalendarView from './CalendarView'
import type { Dict, Lang } from '../lib/i18n'
import { Panel } from '../components/ui'
import { INCOME_ENV, OTHER, monthOf, spendable, sum, thisMonth, todayISO } from './logic'
import { dayLabel, fmt0 } from './fmt'
import type { Money } from './useMoney'

export default function LogView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { db, cur, planNames } = money

  const rows = useMemo(() => db.entries.filter(e => monthOf(e) === cur), [db.entries, cur])
  const byDay = useMemo(() => {
    const g: Record<string, typeof rows> = {}
    for (const e of rows) (g[e.date] ??= []).push(e)
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])
  const b = spendable(db, cur, todayISO())
  // "เหลือใช้ได้วันละ" only means something for the month you are living in. On a past or future
  // month daysLeft falls back to the whole month, which read as "อีก 31 วันกว่าจะสิ้นเดือน" in October.
  const isNow = cur === thisMonth()
  const envs = [OTHER, ...planNames, INCOME_ENV]

  return (
    <div className="space-y-3">
      {/* sticky quick-add: the thing done every day. The hint below it is not sticky — it would cost
          another 30px of a 812px screen for a line that is only read once. */}
      <div className="sticky top-[var(--hdr,0px)] z-20 -mx-3 bg-page px-3 pt-1 pb-2 sm:mx-0 sm:px-0">
        <QuickAdd money={money} t={t} />
      </div>
      <p className="-mt-2 px-1 text-[11px] text-muted">{t.money.hint}</p>

      {isNow && b.hasPlan && (
        <div className="flex flex-wrap items-baseline gap-x-2 rounded-xl border border-line bg-card px-3 py-2.5">
          <span className="text-xs text-muted">{b.left > 0 ? t.money.perDayLeft : t.money.overPlan}</span>
          <b className={`font-mono text-3xl font-bold ${b.left > 0 ? 'text-accent' : 'text-neg'}`}>{fmt0(b.left > 0 ? b.perDay : -b.left)}</b>
          <span className="text-[11px] text-muted">{b.left > 0 ? t.money.leftDays(fmt0(b.left), b.daysLeft) : t.money.daysToEnd(b.daysLeft)}</span>
        </div>
      )}

      <CalendarView money={money} t={t} />

      {byDay.length === 0 ? (
        <p className="py-10 text-center text-sm whitespace-pre-line text-muted">{t.money.emptyMonth}</p>
      ) : byDay.map(([d, items]) => (
        <div key={d} id={`day-${d}`} className="scroll-mt-[calc(var(--hdr,0px)+5rem)]"><Panel icon={NotebookPen} title={`${dayLabel(d, lang)} · ${fmt0(sum(items.filter(x => x.type === 'out')))}`}>
          <ul className="-my-1 divide-y divide-line">
            {items.map(e => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                <span className="min-w-0 basis-full truncate text-sm sm:basis-0 sm:flex-1">{e.note}</span>
                <select className="field w-28 min-w-0 flex-1 !text-xs sm:w-40 sm:flex-none" value={envs.includes(e.env) ? e.env : OTHER}
                  onChange={ev => money.setEnv(e.id, ev.target.value)} aria-label={t.money.envelope}>
                  {!envs.includes(e.env) && <option value={OTHER}>{e.env}</option>}
                  {envs.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <label className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-muted focus-within:outline-2 focus-within:outline-accent">
                  <CalendarDays size={18} aria-hidden />
                  <input type="date" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={e.date}
                    onChange={ev => money.setDate(e.id, ev.target.value)} aria-label={t.money.changeDate(e.note)} />
                </label>
                <button className={`h-11 w-20 shrink-0 px-1 text-right font-mono text-sm font-bold ${e.type === 'in' ? 'text-pos' : 'text-ink'}`}
                  aria-label={t.money.editAmount(e.note)}
                  onClick={() => {
                    const v = prompt(t.money.editPrompt(e.note), String(e.amount))
                    if (v !== null) money.setAmount(e.id, money.evalAmount(v))
                  }}>
                  {e.type === 'in' ? '+' : '−'}{fmt0(e.amount)}
                </button>
                <button className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-neg" aria-label={t.money.del}
                  onClick={() => money.delEntry(e.id)}><X size={18} /></button>
              </li>
            ))}
          </ul>
        </Panel></div>
      ))}
    </div>
  )
}
