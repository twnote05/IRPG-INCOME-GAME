import { ArrowUpDown, Backpack, Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Asset, Horizon, Realm } from '../types'
import { CONCENTRATION_LIMIT, HORIZONS, REALM_KEYS, quoteKey, realmHex, signed, thb } from '../lib/game'
import type { Game } from '../lib/useGame'
import { Panel, inputCls } from './ui'

type SortKey = 'name' | 'realm' | 'category' | 'invested' | 'currentValue' | 'pl' | 'purchaseDate'
const COLS: { key: SortKey; num?: boolean }[] = [
  { key: 'name' }, { key: 'realm' }, { key: 'category' }, { key: 'invested', num: true },
  { key: 'currentValue', num: true }, { key: 'pl', num: true }, { key: 'purchaseDate' },
]
const val = (a: Asset, k: SortKey) => (k === 'pl' ? a.currentValue - a.invested : a[k])

export default function AssetTable({ game, onEdit }: { game: Game; onEdit: (a: Asset) => void }) {
  const { s, stats, deleteAsset, t, dark, live } = game
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'currentValue', dir: -1 })
  const [realm, setRealm] = useState<Realm | 'all'>('all')
  const [term, setTerm] = useState<Horizon | 'unset' | 'all'>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return s.assets
      .filter(a => (realm === 'all' || a.realm === realm) && (term === 'all' || (a.horizon ?? 'unset') === term)
        && (!needle || `${a.name} ${a.symbol} ${a.platform ?? ''}`.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const x = val(a, sort.key), y = val(b, sort.key)
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
      })
  }, [s.assets, realm, term, q, sort])

  const toggle = (key: SortKey) => setSort(p => ({ key, dir: p.key === key ? (-p.dir as 1 | -1) : 1 }))

  const RealmChip = ({ a }: { a: Asset }) => {
    const hex = realmHex(a.realm, dark)
    return <span className="px-1.5 py-0.5 text-[11px]" style={{ color: hex, background: hex + '22' }}>{t.realms[a.realm].name}</span>
  }
  const Overweight = ({ a }: { a: Asset }) => stats.overweight.includes(a.id)
    ? <span title={t.table.overweight(CONCENTRATION_LIMIT)} className="ml-1.5 bg-red-500/20 px-1 text-[10px] text-red-700">&gt;{CONCENTRATION_LIMIT}%</span>
    : null
  const LiveBadge = ({ a }: { a: Asset }) => {
    const k = quoteKey(a)
    if (!k) return null
    const q = live.quotes[k]
    const title = q ? t.live.badge('฿' + q.price.toLocaleString('th-TH', { maximumFractionDigits: 2 }), q.announced ?? new Date(q.ts * 1000).toLocaleTimeString()) : t.live.connecting
    return <span title={title} className={`ml-1.5 px-1 text-[10px] ${q ? 'bg-emerald-500/20 text-emerald-700' : 'bg-slate-800 text-slate-500'}`}>● {t.live.live}</span>
  }
  const Meta = ({ a }: { a: Asset }) => (a.horizon || a.platform) ? (
    <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
      {a.horizon && <span className="bg-violet-500/15 px-1 text-violet-700">{t.horizons[a.horizon].name}</span>}
      {a.platform && <span className="bg-slate-800 px-1 text-slate-400">{t.table.via(a.platform)}</span>}
    </div>
  ) : null
  const Actions = ({ a }: { a: Asset }) => (
    <span className="flex shrink-0 gap-1">
      <button onClick={() => onEdit(a)} className="btn p-2" aria-label={t.table.edit(a.symbol)}><Pencil size={14} /></button>
      <button onClick={() => confirm(t.table.delConfirm(a.symbol)) && deleteAsset(a.id)} className="btn p-2 text-red-700" aria-label={t.table.del(a.symbol)}><Trash2 size={14} /></button>
    </span>
  )
  const PL = ({ a }: { a: Asset }) => {
    const pl = a.currentValue - a.invested
    const pct = a.invested > 0 ? (pl / a.invested) * 100 : 0
    return <span className={pl >= 0 ? 'text-emerald-700' : 'text-red-700'}>{signed(pl, thb)} <span className="text-[10px]">({signed(pct, n => n.toFixed(1) + '%')})</span></span>
  }

  return (
    <Panel title={t.table.title} icon={Backpack} glow="gold">
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-40 flex-1 max-sm:basis-full">
          <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-500" />
          <input className={`${inputCls} pl-8`} type="search" placeholder={t.table.search} value={q} onChange={e => setQ(e.target.value)} aria-label={t.table.searchAria} />
        </div>
        <select className={`${inputCls} !w-auto max-sm:min-w-0 max-sm:flex-1`} value={realm} onChange={e => setRealm(e.target.value as Realm | 'all')} aria-label={t.table.filterAria}>
          <option value="all">{t.table.allRealms}</option>
          {REALM_KEYS.map(r => <option key={r} value={r}>{t.realms[r].name}</option>)}
        </select>
        <select className={`${inputCls} !w-auto max-sm:min-w-0 max-sm:flex-1`} value={term} onChange={e => setTerm(e.target.value as Horizon | 'unset' | 'all')} aria-label={t.modal.horizon}>
          <option value="all">{t.table.allTerms}</option>
          {[...HORIZONS, 'unset' as const].map(h => <option key={h} value={h}>{t.horizons[h].name}</option>)}
        </select>
        {/* phones have no column headers to tap, so sort from a select */}
        <select className={`${inputCls} max-sm:!w-full sm:hidden`} value={sort.key} aria-label={t.table.sortBy}
          onChange={e => { const key = e.target.value as SortKey; setSort({ key, dir: COLS.find(c => c.key === key)?.num ? -1 : 1 }) }}>
          {COLS.map(c => <option key={c.key} value={c.key}>{t.table.sortBy}: {t.table.cols[c.key]}</option>)}
        </select>
      </div>

      {/* Phone: cards */}
      <ul className="space-y-2 sm:hidden">
        {rows.map(a => (
          <li key={a.id} className="sunken p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-100">{a.symbol}<Overweight a={a} /><LiveBadge a={a} /></div>
                <div className="truncate text-[11px] text-slate-500">{a.name}</div>
                <Meta a={a} />
              </div>
              <Actions a={a} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
              <RealmChip a={a} /> {t.categories[a.category]} · {a.purchaseDate}
            </div>
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-mono text-xs">
              <span>{thb(a.invested)} → <b className="text-slate-100">{thb(a.currentValue)}</b></span>
              <PL a={a} />
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet / desktop: sortable table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] tracking-wider text-slate-500 uppercase">
              {COLS.map(c => (
                <th key={c.key} className={`py-2 font-medium ${c.num ? 'text-right' : 'text-left'}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => toggle(c.key)} className={`inline-flex items-center gap-1 hover:text-slate-300 ${sort.key === c.key ? 'text-amber-800' : ''}`}>
                    {t.table.cols[c.key]} <ArrowUpDown size={11} />
                  </button>
                </th>
              ))}
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="py-2"><div className="font-semibold text-slate-100">{a.symbol}<Overweight a={a} /><LiveBadge a={a} /></div><div className="text-[11px] text-slate-500">{a.name}</div><Meta a={a} /></td>
                <td><RealmChip a={a} /></td>
                <td className="text-xs text-slate-400">{t.categories[a.category]}</td>
                <td className="text-right font-mono text-xs">{thb(a.invested)}</td>
                <td className="text-right font-mono text-xs">{thb(a.currentValue)}</td>
                <td className="text-right font-mono text-xs"><PL a={a} /></td>
                <td className="pl-3 text-xs text-slate-500">{a.purchaseDate}</td>
                <td className="py-1"><div className="flex justify-end"><Actions a={a} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{t.table.none}</p>}
    </Panel>
  )
}
