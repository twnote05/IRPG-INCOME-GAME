import { CalendarRange, PieChart, PiggyBank, Scale } from 'lucide-react'
import type { Dict, Lang } from '../lib/i18n'
import { Panel } from '../components/ui'
import { BarsH, Donut } from './charts'
import { bucketTotals, budgetState, monthOf, payoffMonth, periodN, sum, vsPlan } from './logic'
import { fmt, fmt0, monthLabel } from './fmt'
import type { Money } from './useMoney'

/**
 * One page, one month. The daily number lives on the log tab and the month picker is in the
 * header, so this view answers only "where did the money go, and am I inside the plan?".
 */
export default function SummaryView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { db, cur } = money

  const plan = db.months[cur]?.plan ?? []
  const rows = db.entries.filter(e => monthOf(e) === cur)
  const spentIn = (env?: string) => sum(rows.filter(e => e.type === 'out' && (!env || e.env === env)))
  const spent = spentIn()
  const planned = sum(plan)

  const byEnv: Record<string, number> = {}
  for (const e of rows) if (e.type === 'out') byEnv[e.env] = (byEnv[e.env] || 0) + e.amount

  // sorted by share of its own budget, so the nearly-empty envelope floats to the top
  const vs = vsPlan(plan, spentIn).filter(r => r.planned > 0 || r.actual > 0)
    .map(r => ({ ...r, st: budgetState(r.actual, r.planned), ratio: r.planned > 0 ? r.actual / r.planned : r.actual > 0 ? 9e9 : 0 }))
    .sort((a, b) => b.ratio - a.ratio)
  const near = vs.filter(r => r.st !== 'ok').length
  const debts = plan.filter(p => p.of)
  const buckets = Object.entries(bucketTotals(db)).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-3">
      <div className="bevel bg-slate-900 px-4 py-5 text-center">
        <div className="text-[11px] tracking-widest text-slate-500 uppercase">{t.money.spentMonth}</div>
        <div className={`font-mono text-4xl font-bold ${planned && spent > planned ? 'text-red-700' : 'text-slate-100'}`}>{fmt(spent)}</div>
        <div className="text-xs text-slate-500">
          {planned ? (spent > planned ? t.money.overBy(fmt0(spent - planned)) : t.money.underPlan(fmt0(planned - spent))) : t.money.noPlan}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={t.money.whereMonth} icon={PieChart} glow="gold">
          <Donut rows={Object.entries(byEnv).map(([label, value]) => ({ label, value }))}
            totalLabel={t.money.total} empty={t.money.noSpend} otherLabel={t.money.otherN} />
        </Panel>

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

        <Panel title={t.money.bucketsAll} icon={PiggyBank} glow="emerald">
          <BarsH empty={t.money.noData} rows={buckets.map(([label, value]) => ({ label, value }))} />
          {buckets.length > 0 && (
            <div className="mt-3 flex justify-between border-t border-slate-800 pt-2 text-sm">
              <span>{t.money.total}</span><b className="font-mono text-emerald-700">{fmt0(sum(buckets, b => b[1]))}</b>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
