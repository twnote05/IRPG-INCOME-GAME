import { BarChart3, CalendarRange, PieChart, PiggyBank, Scale } from 'lucide-react'
import { useState } from 'react'
import type { Dict, Lang } from '../lib/i18n'
import { Panel } from '../components/ui'
import { BarsH, BarsV, Donut } from './charts'
import {
  bucketTotals, budgetState, dailyBudget, daysInMonth, monthOf, payoffMonth, periodN, prevMonth, sum, todayISO, vsPlan, yearMonths,
} from './logic'
import { dayLabel, fmt, fmt0, monShort, monthLabel, yearLabel } from './fmt'
import type { Money } from './useMoney'

type Mode = 'day' | 'month' | 'year'
const MODE_KEY = 'investor-rpg:money.summode'

export default function SummaryView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { db, cur } = money
  const [mode, setModeState] = useState<Mode>(() => { try { return (localStorage.getItem(MODE_KEY) as Mode) || 'month' } catch { return 'month' } })
  const setMode = (m: Mode) => { setModeState(m); try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ } }

  const plan = db.months[cur]?.plan ?? []
  const entriesOf = (m: string) => db.entries.filter(e => monthOf(e) === m)
  const spentIn = (m: string, env?: string) => sum(entriesOf(m).filter(e => e.type === 'out' && (!env || e.env === env)))
  const planOf = (m: string) => sum(db.months[m]?.plan ?? [])
  const today = todayISO()
  const donut = (rows: { label: string; value: number }[]) =>
    <Donut rows={rows} totalLabel={t.money.total} empty={t.money.noSpend} otherLabel={t.money.otherN} />
  const byEnv = (list: typeof db.entries) => {
    const g: Record<string, number> = {}
    for (const e of list) if (e.type === 'out') g[e.env] = (g[e.env] || 0) + e.amount
    return Object.entries(g).map(([label, value]) => ({ label, value }))
  }

  // ---- hero + charts per mode ----
  let cap = '', hero = '', heroTone = '', sub = '', trendTitle = '', envTitle = ''
  let trend: React.ReactNode = null, env: React.ReactNode = null
  if (mode === 'year') {
    const y = cur.slice(0, 4), ms = yearMonths(y)
    const spent = sum(ms, k => spentIn(k)), planned = sum(ms, planOf), income = sum(ms, k => sum(db.months[k]?.income ?? []))
    cap = t.money.yearCap(yearLabel(y, lang)); hero = fmt(spent)
    sub = income ? t.money.yearSub(fmt0(income), fmt0(planned)) : t.money.noYear
    trendTitle = t.money.trendMonths
    trend = <BarsV empty={t.money.noData} rows={ms.map(k => spentIn(k)
      ? { label: monShort(k, lang), value: spentIn(k), now: k === cur }
      : { label: monShort(k, lang), value: planOf(k), planOnly: true, now: k === cur })} />
    envTitle = t.money.whereYear
    env = donut(byEnv(db.entries.filter(e => e.date.startsWith(y))))
  } else if (mode === 'day') {
    const b = dailyBudget(planOf(cur), spentIn(cur), cur, today)
    cap = t.money.perDayCap; hero = fmt(b.perDay); heroTone = b.left > 0 ? '' : 'text-red-700'
    sub = b.left > 0 ? t.money.leftDays(fmt0(b.left), b.daysLeft) : t.money.overBy(fmt0(-b.left))
    const perDay: Record<number, number> = {}
    for (const e of entriesOf(cur)) if (e.type === 'out') perDay[+e.date.slice(8, 10)] = (perDay[+e.date.slice(8, 10)] || 0) + e.amount
    trendTitle = t.money.trendDaily
    trend = <BarsV empty={t.money.noData} rows={Array.from({ length: daysInMonth(cur) }, (_, i) => ({
      label: (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '', value: perDay[i + 1] || 0,
      now: today === `${cur}-${String(i + 1).padStart(2, '0')}`,
    }))} />
    envTitle = t.money.topDays
    env = <BarsH empty={t.money.noData} rows={Object.entries(perDay).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([d, value]) => ({ label: dayLabel(`${cur}-${String(d).padStart(2, '0')}`, lang), value }))} />
  } else {
    const spent = spentIn(cur), planned = planOf(cur)
    cap = t.money.spentMonth; hero = fmt(spent); heroTone = planned && spent > planned ? 'text-red-700' : ''
    sub = planned ? (spent > planned ? t.money.overBy(fmt0(spent - planned)) : t.money.underPlan(fmt0(planned - spent))) : t.money.noPlan
    const seq: string[] = []
    for (let k = cur, i = 0; i < 6; i++, k = prevMonth(k)) seq.unshift(k)
    const rows = seq.map(k => spentIn(k)
      ? { label: monShort(k, lang), value: spentIn(k), now: k === cur }
      : { label: monShort(k, lang), value: planOf(k), planOnly: true, now: k === cur })
    trendTitle = t.money.trend6
    trend = <>
      <BarsV empty={t.money.noData} rows={rows} />
      {rows.some(r => r.planOnly && r.value) && <p className="mt-2 text-[11px] text-slate-500">{t.money.planOnlyNote}</p>}
    </>
    envTitle = t.money.whereMonth
    env = donut(byEnv(entriesOf(cur)))
  }

  // ---- vs plan: sorted by % of own budget, so the nearly-empty envelope floats to the top ----
  const vs = vsPlan(plan, name => spentIn(cur, name)).filter(r => r.planned > 0 || r.actual > 0)
    .map(r => ({ ...r, st: budgetState(r.actual, r.planned), ratio: r.planned > 0 ? r.actual / r.planned : r.actual > 0 ? 9e9 : 0 }))
    .sort((a, b) => b.ratio - a.ratio)
  const near = vs.filter(r => r.st !== 'ok').length
  const debts = plan.filter(p => p.of)
  const buckets = Object.entries(bucketTotals(db, mode === 'year' ? yearMonths(cur.slice(0, 4)) : Object.keys(db.months)))
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1" role="tablist">
        {(['day', 'month', 'year'] as const).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`btn ${mode === m ? 'btn-pressed font-bold text-emerald-700' : ''}`}>{t.money.modes[m]}</button>
        ))}
      </div>

      <div className="bevel bg-slate-900 px-4 py-5 text-center">
        <div className="text-[11px] tracking-widest text-slate-500 uppercase">{cap}</div>
        <div className={`font-mono text-4xl font-bold text-slate-100 ${heroTone}`}>{hero}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={trendTitle} icon={BarChart3} glow="mana">{trend}</Panel>
        <Panel title={envTitle} icon={PieChart} glow="gold">{env}</Panel>

        {mode !== 'year' && (
          <Panel title={t.money.vsPlan} icon={Scale} glow="ruby">
            <BarsH empty={t.money.noData} max={Math.max(...vs.map(r => Math.max(r.planned, r.actual)), 1)}
              rows={vs.map(r => ({
                label: r.name, value: r.actual, st: r.st,
                note: r.st === 'over' ? t.money.noteOver(fmt0(r.planned), fmt0(r.diff))
                  : r.st === 'warn' ? t.money.noteWarn(fmt0(r.planned), fmt0(-r.diff)) : `/ ${fmt0(r.planned)}`,
              }))} />
            <p className={`mt-3 text-xs ${near ? (vs.some(r => r.st === 'over') ? 'text-red-700' : 'text-amber-800') : 'text-slate-500'}`}>
              {near ? t.money.nearCount(near) : t.money.allOk}
            </p>
          </Panel>
        )}

        {mode !== 'day' && (
          <Panel title={t.money.debtTitle} icon={CalendarRange} glow="gold">
            {debts.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">{t.money.noInstallments}</p> : (
              <ul className="divide-y divide-slate-800">
                {debts.map(p => {
                  const leftN = Math.max(0, (p.of ?? 0) - periodN(p)), end = payoffMonth(p, cur)
                  return (
                    <li key={p.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-100">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{t.money.debtRow(periodN(p), p.of ?? 0, leftN, fmt0(p.amount * leftN))}</div>
                      </div>
                      <span className={`shrink-0 font-mono text-sm ${leftN ? 'text-slate-200' : 'text-emerald-700'}`}>
                        {leftN && end ? monthLabel(end, lang) : t.money.paidOff}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        )}

        {mode !== 'day' && (
          <Panel title={mode === 'year' ? t.money.bucketsYear : t.money.bucketsAll} icon={PiggyBank} glow="emerald">
            <BarsH empty={t.money.noData} rows={buckets.map(([label, value]) => ({ label, value }))} />
            {buckets.length > 0 && (
              <div className="mt-3 flex justify-between border-t border-slate-800 pt-2 text-sm">
                <span>{t.money.total}</span><b className="font-mono text-emerald-700">{fmt0(sum(buckets, b => b[1]))}</b>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
