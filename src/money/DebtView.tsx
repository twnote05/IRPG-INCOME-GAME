import { CalendarCheck, Flag, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import type { Dict, Lang } from '../lib/i18n'
import { Bar, Panel } from '../components/ui'
import AmountInput from './AmountInput'
import { payoffPlan } from './logic'
import { fmt0, monthLabel } from './fmt'
import type { Money } from './useMoney'

/**
 * The months ahead, where the Plan tab is only this month: which debt to clear first, when the
 * last one goes, and what putting a bit extra in actually buys. Everything is derived from the
 * installment rows already in the plan — nothing new is stored, so the sheet is untouched.
 */
export default function DebtView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const T = t.money
  const plan = money.month?.plan ?? []
  const [extra, setExtra] = useState(0)
  const base = payoffPlan(plan, money.cur)
  const now = payoffPlan(plan, money.cur, extra)
  const sooner = base.months - now.months
  const widest = Math.max(1, ...now.debts.map(d => d.balance))

  if (!now.debts.length) {
    return (
      <Panel title={T.payoffOrder} icon={Flag}>
        <p className="text-sm text-muted">{T.noSchedulable}</p>
        {now.open.length > 0 && <p className="mt-2 text-xs text-warn">{T.openDebts(now.open.join(', '))}</p>}
      </Panel>
    )
  }

  let freed = 0
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-card px-4 py-5 text-center">
        <div className="text-[11px] text-muted">{T.debtFree}</div>
        <div className="font-mono text-4xl font-bold text-pos">{now.end ? monthLabel(now.end, lang) : '—'}</div>
        <div className="text-xs text-muted">{T.monthsToGo(now.months)}</div>
        {sooner > 0 && <div className="mt-1 text-xs font-semibold text-accent">{T.sooner(sooner)}</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([[T.owedTotal, now.total], [T.freedPerMonth, now.freed]] as const).map(([label, v]) => (
          <div key={label} className="rounded-xl border border-line bg-card p-3 text-center">
            <div className="text-[11px] text-muted">{label}</div>
            <div className="font-mono text-xl font-bold">{fmt0(v)}</div>
          </div>
        ))}
      </div>

      <Panel title={T.extraPay} icon={TrendingDown}>
        <div className="flex items-center gap-3">
          <div className="w-32 shrink-0"><AmountInput value={extra} onCommit={v => setExtra(Math.max(0, v ?? 0))} ariaLabel={T.extraPay} /></div>
          <p className="min-w-0 flex-1 text-xs text-muted">{T.extraHint}</p>
        </div>
      </Panel>

      <Panel title={T.payoffOrder} icon={Flag}>
        <ol className="space-y-2">
          {now.debts.map((d, i) => {
            freed += d.pay
            return (
              <li key={d.name + i} className="rounded-lg border border-line p-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-line font-mono text-xs font-bold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{d.name}</span>
                  <span className="shrink-0 font-mono text-sm">{fmt0(d.balance)}</span>
                </div>
                <div className="mt-1.5"><Bar value={d.balance} max={widest} color="bg-accent" className="h-1.5" /></div>
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <CalendarCheck size={12} className="shrink-0" />
                    {d.end ? T.closesOn(monthLabel(d.end, lang), d.months) : T.noClose}
                  </span>
                  <span>{T.thenFreed(fmt0(d.pay), fmt0(freed))}</span>
                </div>
              </li>
            )
          })}
        </ol>
        {now.open.length > 0 && <p className="mt-3 border-t border-line pt-2 text-xs text-warn">{T.openDebts(now.open.join(', '))}</p>}
        <p className="mt-2 text-[11px] text-muted">{T.payoffCaveat}</p>
      </Panel>
    </div>
  )
}
