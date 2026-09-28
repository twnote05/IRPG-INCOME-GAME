import { NotebookPen, X } from 'lucide-react'
import { Sprite } from '../components/Sprite'
import { useMemo } from 'react'
import QuickAdd from './QuickAdd'
import CalendarView from './CalendarView'
import type { Dict, Lang } from '../lib/i18n'
import { Bar, Panel } from '../components/ui'
import { INCOME_ENV, OTHER, dailyBudget, dayLog, monthOf, sum, thisMonth, todayISO } from './logic'
import { dayLabel, fmt0 } from './fmt'
import type { Money } from './useMoney'

export default function LogView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { db, cur, month, planNames, summary, rest } = money

  const rows = useMemo(() => db.entries.filter(e => monthOf(e) === cur), [db.entries, cur])
  const byDay = useMemo(() => {
    const g: Record<string, typeof rows> = {}
    for (const e of rows) (g[e.date] ??= []).push(e)
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])
  const planned = sum(month?.plan ?? [])
  const spent = sum(rows.filter(e => e.type === 'out'))
  const b = dailyBudget(planned, spent, cur, todayISO())
  const envs = [OTHER, ...planNames, INCOME_ENV]
  const today = todayISO()
  const live = cur === thisMonth()
  const day = live && planned > 0 ? dayLog(db, cur, planned).find(d => d.date === today) : undefined
  const spentToday = rows.some(e => e.date === today && e.type === 'out')
  const rested = rest.includes(today) && !spentToday

  return (
    <div className="space-y-3">
      {/* sticky quick-add: the thing done every day */}
      <div className="sticky top-[var(--hdr,0px)] z-20 -mx-3 bg-[var(--page)] px-3 pt-1 pb-2 sm:mx-0 sm:px-0">
        <QuickAdd money={money} t={t} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {day ? (
          <div className="bevel bg-slate-900 px-3 py-2.5" title={t.adv.dayHpHint}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1 text-xs text-slate-400"><Sprite name="heart" size={16} /> {t.adv.dayHp}</span>
              <b className={`font-mono text-xl ${day.hp >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt0(day.hp)}</b>
            </div>
            <Bar value={Math.max(0, day.hp)} max={day.max} color={day.hp < day.max * 0.3 ? 'bg-red-600' : 'bg-emerald-600'} className="my-1.5 h-3" />
            <div className="text-[11px] text-slate-500">
              {day.hp < 0 ? t.adv.dayHurt(fmt0(-day.hp)) : day.spent ? t.adv.dayHit(fmt0(day.spent), fmt0(day.hp)) : t.adv.dayFull}
            </div>
          </div>
        ) : planned > 0 && (
          <div className={`bevel flex flex-wrap items-baseline gap-x-2 bg-slate-900 px-3 py-2.5 ${b.left > 0 ? '' : 'text-red-700'}`}>
            <span className="text-xs text-slate-400">{b.left > 0 ? t.money.perDayLeft : t.money.overPlan}</span>
            <b className={`font-mono text-2xl ${b.left > 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt0(b.left > 0 ? b.perDay : -b.left)}</b>
            <span className="text-[11px] text-slate-500">{b.left > 0 ? t.money.leftDays(fmt0(b.left), b.daysLeft) : t.money.daysToEnd(b.daysLeft)}</span>
          </div>
        )}
        <div className="bevel flex items-center gap-3 bg-slate-900 px-3 py-2.5" title={t.money.streakHint}>
          <Sprite name="flame" size={32} className={summary.streak ? 'animate-idle' : 'opacity-40 grayscale'} />
          <div>
            <div className="font-rpg text-lg text-slate-100">{t.money.streak(summary.streak)}</div>
            <div className="text-[11px] text-slate-500">{summary.loggedToday ? t.money.questDone : t.money.questTodo}</div>
            {live && !spentToday && (rested
              ? <div className="mt-1 text-[11px] text-blue-700">{t.adv.rested}</div>
              : <button className="btn mt-1 !py-0.5 text-[11px]" onClick={money.restToday}>{t.adv.rest}</button>)}
          </div>
        </div>
      </div>

      <CalendarView money={money} t={t} />

      {byDay.length === 0 ? (
        <p className="py-10 text-center text-sm whitespace-pre-line text-slate-500">{t.money.emptyMonth}</p>
      ) : byDay.map(([d, items]) => (
        <div key={d} id={`day-${d}`} className="scroll-mt-[calc(var(--hdr,0px)+5rem)]"><Panel icon={NotebookPen} glow="mana" title={`${dayLabel(d, lang)} · ${fmt0(sum(items.filter(x => x.type === 'out')))}`}>
          <ul className="-my-1 divide-y divide-slate-800">
            {items.map(e => (
              <li key={e.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{e.note}</span>
                <select className="field w-28 shrink-0 !py-1 !text-xs sm:w-40" value={envs.includes(e.env) ? e.env : OTHER}
                  onChange={ev => money.setEnv(e.id, ev.target.value)} aria-label={t.money.envelope}>
                  {!envs.includes(e.env) && <option value={OTHER}>{e.env}</option>}
                  {envs.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button className={`w-20 shrink-0 px-1 text-right font-mono text-sm font-bold ${e.type === 'in' ? 'text-emerald-700' : 'text-red-700'}`}
                  aria-label={t.money.editAmount(e.note)}
                  onClick={() => {
                    const v = prompt(t.money.editPrompt(e.note), String(e.amount))
                    if (v !== null) money.setAmount(e.id, money.evalAmount(v))
                  }}>
                  {e.type === 'in' ? '+' : '−'}{fmt0(e.amount)}
                </button>
                <button className="shrink-0 p-1 text-slate-500 hover:text-red-700" aria-label={t.money.del}
                  onClick={() => confirm(t.money.delConfirm(e.note)) && money.delEntry(e.id)}><X size={16} /></button>
              </li>
            ))}
          </ul>
        </Panel></div>
      ))}
    </div>
  )
}
