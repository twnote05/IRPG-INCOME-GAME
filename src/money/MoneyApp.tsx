import { Settings2 } from 'lucide-react'
import type { Dict, Lang } from '../lib/i18n'
import AdventureView from './AdventureView'
import LogView from './LogView'
import MoneySettings, { SyncStatus } from './MoneySettings'
import PlanView from './PlanView'
import SummaryView from './SummaryView'
import { monthLabel } from './fmt'
import type { Money } from './useMoney'

export type MoneyTab = 'log' | 'adv' | 'plan' | 'sum' | 'set'
/** Settings is opened a few times a year, so it sits behind the gear instead of taking a tab. */
export const MONEY_TABS: MoneyTab[] = ['log', 'adv', 'plan', 'sum']

export default function MoneyApp({ money, t, lang, tab, setTab }: { money: Money; t: Dict; lang: Lang; tab: MoneyTab; setTab: (t: MoneyTab) => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* desktop tabs; phones use the bottom taskbar */}
        <div className="flex gap-1 max-md:hidden" role="tablist">
          {MONEY_TABS.map(k => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`btn ${tab === k ? 'btn-pressed font-bold text-emerald-700' : ''}`}>{t.money.tabs[k]}</button>
          ))}
        </div>
        {tab !== 'set' && (
          <select className="field ml-auto !w-auto font-semibold" value={money.cur} onChange={e => money.setCur(e.target.value)} aria-label={t.money.pickMonth}>
            {money.months.map(m => <option key={m} value={m}>{monthLabel(m, lang)}</option>)}
          </select>
        )}
        <button onClick={() => setTab(tab === 'set' ? 'log' : 'set')} aria-pressed={tab === 'set'}
          className={`btn grid size-11 place-items-center p-0 ${tab === 'set' ? 'btn-pressed ml-auto text-emerald-700' : ''}`}
          aria-label={t.money.tabs.set} title={t.money.tabs.set}>
          <Settings2 size={18} />
        </button>
      </div>
      {money.gas && tab !== 'set' && <div className="-mt-1 text-right"><SyncStatus money={money} t={t} /></div>}

      {tab === 'log' && <LogView money={money} t={t} lang={lang} />}
      {tab === 'adv' && <AdventureView money={money} t={t} lang={lang} />}
      {tab === 'plan' && <PlanView money={money} t={t} lang={lang} />}
      {tab === 'sum' && <SummaryView money={money} t={t} lang={lang} />}
      {tab === 'set' && <MoneySettings money={money} t={t} />}

      {/* one tap to delete, one tap to get it back */}
      {money.undo && (
        <div role="status" className="bevel fixed inset-x-3 bottom-[4.5rem] z-40 mx-auto flex max-w-md items-center gap-3 bg-slate-900 px-3 py-2.5 text-sm md:bottom-6">
          <span className="min-w-0 flex-1 truncate text-slate-200">{t.money.deleted(money.undo.label)}</span>
          <button className="btn btn-primary shrink-0" onClick={money.undoDelete}>{t.money.undo}</button>
        </div>
      )}
    </div>
  )
}
