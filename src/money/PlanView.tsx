import { CalendarRange, Copy, Fuel, PiggyBank, Plus, Receipt, X } from 'lucide-react'
import { useState } from 'react'
import type { Dict, Lang } from '../lib/i18n'
import { Bar, Panel, inputCls } from '../components/ui'
import AmountInput from './AmountInput'
import { DEFAULT_FUEL, alloc, budgetState, byAccount, fuelCost, isDebt, monthOf, payoffMonth, periodN, prevMonth, sum, type Fuel as FuelT } from './logic'
import { fmt, fmt0, monthLabel } from './fmt'
import type { Money } from './useMoney'

const STATE = { ok: 'text-slate-500', warn: 'text-amber-800', over: 'text-red-700' }

export default function PlanView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { cur, db, saved, goals } = money
  const m = money.month ?? { income: [], plan: [], buckets: [], fuel: DEFAULT_FUEL }
  const income = sum(m.income), planned = sum(m.plan)
  const left = income - planned
  const spentIn = (env?: string) => sum(db.entries.filter(e => monthOf(e) === cur && e.type === 'out' && (!env || e.env === env)))
  const totPct = sum(m.buckets, b => b.pct)
  const accts = byAccount(m.plan)
  const prev = prevMonth(cur)

  const Del = ({ onClick }: { onClick: () => void }) =>
    <button className="shrink-0 p-1 text-slate-500 hover:text-red-700" aria-label={t.money.del} onClick={onClick}><X size={15} /></button>
  const Add = ({ label, onClick }: { label: string; onClick: () => void }) =>
    <button className="btn mt-2 flex items-center gap-1 text-xs" onClick={onClick}><Plus size={13} /> {label}</button>

  return (
    <div className="space-y-3">
      <div className="bevel bg-slate-900 px-4 py-5 text-center">
        <div className="text-[11px] tracking-widest text-slate-500 uppercase">{t.money.leftAfter}</div>
        <div className={`font-mono text-4xl font-bold ${left >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(left)}</div>
        <div className="text-xs text-slate-500">{t.money.incomeMinusPlan(fmt0(income), fmt0(planned))}</div>
      </div>

      <Panel title={t.money.income} icon={Receipt} glow="emerald">
        {m.income.map(r => (
          <div key={r.id} className="flex items-center gap-2 py-1">
            <input className={`${inputCls} min-w-0 flex-1`} value={r.name} placeholder={t.money.incomeName}
              onChange={e => money.updateRow('income', r.id, { name: e.target.value })} />
            <div className="w-32 shrink-0"><AmountInput value={r.amount} onCommit={v => money.updateRow('income', r.id, { amount: v ?? 0 })} ariaLabel={t.money.amount} /></div>
            <Del onClick={() => money.delRow('income', r.id)} />
          </div>
        ))}
        <Add label={t.money.addIncome} onClick={() => money.addRow('income')} />
      </Panel>

      <Panel title={t.money.recurring} icon={Receipt} glow="ruby">
        {m.plan.filter(r => !isDebt(r)).length === 0 && <p className="text-xs text-slate-500">{t.money.noItems}</p>}
        {m.plan.filter(r => !isDebt(r)).map(r => {
          const act = spentIn(r.name)
          return (
            // one grid so name / amount / spent / ✕ share a line; the account note sits under the name
            <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_7rem_3.5rem_auto] items-center gap-x-2 border-b border-slate-800 py-1.5 last:border-0">
              <input className={`${inputCls} min-w-0`} value={r.name} placeholder={t.money.itemName}
                onChange={e => money.updateRow('plan', r.id, { name: e.target.value })} />
              <div className="min-w-0"><AmountInput value={r.amount} onCommit={v => money.updateRow('plan', r.id, { amount: v ?? 0 })} ariaLabel={t.money.amount} /></div>
              <span className={`text-right font-mono text-xs ${act ? STATE[budgetState(act, r.amount)] : 'text-slate-600'}`} title={t.money.spentSoFar}>
                {act ? fmt0(act) : '–'}
              </span>
              <Del onClick={() => money.delRow('plan', r.id)} />
              <input className="col-span-4 mt-0.5 w-24 bg-transparent px-1 text-[11px] text-slate-500 outline-none placeholder:text-slate-600 focus:text-slate-200"
                value={r.acct ?? ''} placeholder={t.money.acct} aria-label={t.money.acct} onChange={e => money.updateRow('plan', r.id, { acct: e.target.value || undefined })} />
            </div>
          )
        })}
        <Add label={t.money.addItem} onClick={() => money.addRow('plan')} />
      </Panel>

      <Panel title={t.money.debts} icon={CalendarRange} glow="gold">
        {m.plan.filter(isDebt).length === 0 && <p className="text-xs text-slate-500">{t.money.noDebts}</p>}
        <div className="space-y-2">
          {m.plan.filter(isDebt).map(r => {
            const n = periodN(r), leftN = Math.max(0, (r.of ?? 0) - n)
            const paid = n * (+r.amount || 0), remain = leftN * (+r.amount || 0), total = +(r.total ?? 0) || 0
            const end = payoffMonth(r, cur)
            return (
              <div key={r.id} className="sunken p-2.5">
                <div className="flex items-center gap-2">
                  <input className={`${inputCls} min-w-0 flex-1 font-semibold`} value={r.name} placeholder={t.money.debtName}
                    onChange={e => money.updateRow('plan', r.id, { name: e.target.value })} />
                  <Del onClick={() => money.delRow('plan', r.id)} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-4">
                  <label>{t.money.principal}<AmountInput value={r.total} placeholder="—" onCommit={v => money.updateRow('plan', r.id, { total: v })} /></label>
                  <label>{t.money.perMonth}<AmountInput value={r.amount} onCommit={v => money.updateRow('plan', r.id, { amount: v ?? 0 })} /></label>
                  <label>{t.money.periodN}<AmountInput value={r.n} integer onCommit={v => money.updateRow('plan', r.id, { n: v })} /></label>
                  <label>{t.money.periodOf}<AmountInput value={r.of} integer
                    onCommit={v => money.updateRow('plan', r.id, v ? { of: v } : { of: undefined, n: undefined })} /></label>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-slate-500">
                  <span>{t.money.paid} <b className="font-mono text-slate-200">{fmt0(paid)}</b>{total ? ` / ${fmt0(total)}` : ''}</span>
                  <span>{leftN && end ? t.money.remain(leftN, fmt0(remain), monthLabel(end, lang)) : <b className="text-emerald-700">{t.money.done}</b>}</span>
                </div>
                {total > 0 && <div className="mt-1.5"><Bar value={paid} max={total} color="bg-blue-600" className="h-1.5" /></div>}
                <input className="mt-2 w-full border border-dashed border-slate-700 bg-transparent px-1.5 py-1 text-[11px] text-slate-400 outline-none"
                  value={r.acct ?? ''} placeholder={t.money.acct} onChange={e => money.updateRow('plan', r.id, { acct: e.target.value || undefined })} />
              </div>
            )
          })}
        </div>
        <Add label={t.money.addDebt} onClick={money.addDebt} />

        <div className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-sm">
          <div className="flex justify-between"><span>{t.money.totalPlan}</span><b className="font-mono text-red-700">-{fmt(planned)}</b></div>
          <div className="flex justify-between text-slate-500"><span>{t.money.spentSoFar}</span><b className="font-mono">-{fmt(spentIn())}</b></div>
          {accts.length > 0 && accts[0][0] !== '—' && (
            <div className="pt-1">
              <div className="text-[11px] text-slate-500">{t.money.byAcct}</div>
              {accts.map(([a, v]) => <div key={a} className="flex justify-between text-xs text-slate-400"><span>{a}</span><span className="font-mono">{fmt0(v)}</span></div>)}
            </div>
          )}
        </div>
      </Panel>

      <Panel title={t.money.allocate} icon={PiggyBank} glow="emerald">
        <p className="mb-2 text-[11px] text-slate-500">{t.money.allocateHint}</p>
        {alloc(left, m.buckets).map(b => {
          const target = goals[b.name]
          return (
            <div key={b.id} className="border-b border-slate-800 py-1.5 last:border-0">
              <div className="flex items-center gap-2">
                <input className={`${inputCls} min-w-0 flex-1`} value={b.name} placeholder={t.money.bucketName}
                  onChange={e => money.updateRow('buckets', b.id, { name: e.target.value })} />
                <div className="flex w-20 shrink-0 items-center gap-0.5">
                  <AmountInput value={b.pct} scale={100} onCommit={v => money.updateRow('buckets', b.id, { pct: v ?? 0 })} ariaLabel="%" />
                  <span className="text-xs text-slate-500">%</span>
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-sm font-bold text-slate-100">{fmt0(b.baht)}</span>
                <Del onClick={() => money.delRow('buckets', b.id)} />
              </div>
              {b.name && (
                <div className="mt-1 flex items-center gap-2 pl-1 text-[11px] text-slate-500">
                  <span className="shrink-0">🎯 {t.money.target}</span>
                  <div className="w-28"><AmountInput value={target} placeholder="—" onCommit={v => money.setGoal(b.name, v ?? 0)} ariaLabel={t.money.target} /></div>
                  <span className="min-w-0 flex-1 truncate">{t.money.savedSoFar(fmt0(saved[b.name] || 0))}</span>
                </div>
              )}
            </div>
          )
        })}
        <Add label={t.money.addBucket} onClick={() => money.addRow('buckets')} />
        <p className={`mt-2 text-xs ${Math.abs(totPct - 1) < 1e-9 ? 'text-emerald-700' : 'text-red-700'}`}>
          {Math.abs(totPct - 1) < 1e-9 ? t.money.pctOk : t.money.pctBad(fmt(totPct * 100), fmt0(left * (1 - totPct)))}
        </p>
      </Panel>

      <FuelCalc money={money} t={t} fuel={{ ...DEFAULT_FUEL, ...m.fuel }} />

      <div className="bevel flex flex-wrap items-center gap-3 bg-slate-900 p-3">
        <button className="btn flex items-center gap-1.5" disabled={!db.months[prev]}
          onClick={() => (!money.month?.plan.length || confirm(t.money.carryConfirm)) && money.carry()}>
          <Copy size={14} /> {t.money.carry}
        </button>
        <span className="text-xs text-slate-500">{db.months[prev] ? t.money.carryFrom(monthLabel(prev, lang)) : t.money.carryNone(monthLabel(prev, lang))}</span>
      </div>
    </div>
  )
}

function FuelCalc({ money, t, fuel }: { money: Money; t: Dict; fuel: FuelT }) {
  const [open, setOpen] = useState(false)
  const plan = money.month?.plan ?? []
  const [target, setTarget] = useState('')
  const pick = target || plan.find(p => /น้ำมัน|แก๊ส|เดินทาง/.test(p.name))?.id || plan[0]?.id || ''
  const litres = (fuel.km || 0) * (fuel.trips || 0) / (fuel.kmpl || 1)
  const rows: [keyof FuelT, string, string][] = [
    ['km', t.money.fuelKm, 'km'], ['trips', t.money.fuelTrips, t.money.uTrips], ['kmpl', t.money.fuelKmpl, 'km/L'],
    ['price', t.money.fuelPrice, '฿'], ['discount', t.money.fuelDiscount, '฿'],
  ]
  return (
    <Panel title={t.money.fuel} icon={Fuel} glow="gold"
      action={<button className="btn px-2 py-0.5 text-xs" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? '−' : '+'}</button>}>
      {!open ? <p className="text-xs text-slate-500">{t.money.fuelHint}</p> : (
        <>
          {rows.map(([k, label, unit]) => (
            <div key={k} className="flex items-center gap-2 py-1 text-sm">
              <span className="min-w-0 flex-1 text-slate-300">{label}</span>
              <div className="w-24"><AmountInput value={fuel[k]} onCommit={v => money.setFuel(k, v ?? 0)} ariaLabel={label} /></div>
              <span className="w-10 text-xs text-slate-500">{unit}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-sm">
            <span className="text-slate-500">{fmt0((fuel.km || 0) * (fuel.trips || 0))} km · {fmt(litres)} L</span>
            <b className="font-mono">{fmt(fuelCost(fuel))}</b>
          </div>
          <div className="mt-2 flex gap-2">
            <select className={`${inputCls} min-w-0 flex-1`} value={pick} onChange={e => setTarget(e.target.value)} aria-label={t.money.fuelApply}>
              {plan.length ? plan.map(p => <option key={p.id} value={p.id}>{p.name || '—'}</option>) : <option value="">{t.money.noPlanRows}</option>}
            </select>
            <button className="btn btn-primary shrink-0" disabled={!pick} onClick={() => money.applyFuel(pick)}>{t.money.fuelApply}</button>
          </div>
        </>
      )}
    </Panel>
  )
}
