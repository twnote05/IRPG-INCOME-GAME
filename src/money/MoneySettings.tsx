import { Brain, CalendarDays, Cloud, Database, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Dict } from '../lib/i18n'
import { Field, Panel, inputCls } from '../components/ui'
import { looksLikeToken, validGasUrl } from './logic'
import type { Money } from './useMoney'

export function download(name: string, text: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: name })
  a.click()
  URL.revokeObjectURL(a.href)
}

export function SyncStatus({ money, t }: { money: Money; t: Dict }) {
  const s = money.sync
  const text = s.state === 'local' ? t.money.localOnly
    : s.state === 'syncing' ? t.money.syncing
      : s.state === 'error' ? t.money.syncErr(s.error ?? '')
        : s.added ? t.money.merged(s.added) : t.money.synced(new Date(s.at ?? Date.now()).toLocaleTimeString())
  const tone = s.state === 'error' ? 'text-red-700' : s.state === 'ok' ? 'text-emerald-700' : 'text-slate-500'
  return <span className={`text-[11px] ${tone}`} role="status">● {text}</span>
}

export default function MoneySettings({ money, t }: { money: Money; t: Dict }) {
  const [url, setUrl] = useState(money.gas?.url ?? '')
  const [token, setToken] = useState('')
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const learned = Object.entries(money.learned)

  const connect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validGasUrl(url)) return setErr(t.money.badUrl)
    if (token.trim().startsWith('AKfycb')) return setErr(t.money.deploymentId)
    if (!looksLikeToken(token) && !confirm(t.money.tokenOdd)) return
    setErr('')
    money.connect({ url, token })
    setToken('')
  }

  return (
    <div className="space-y-3">
      <Panel title={t.cal.payday} icon={CalendarDays} glow="gold">
        <select className={inputCls} value={String(money.payday)} aria-label={t.cal.payday}
          onChange={e => money.setPayday(e.target.value === 'last' ? 'last' : Number(e.target.value))}>
          <option value="last">{t.cal.paydayLast}</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{t.cal.paydayDay(d)}</option>)}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">{t.cal.paydayHint}</p>
      </Panel>

      <Panel title={t.money.connectSheet} icon={Cloud} glow="mana">
        {money.gas ? (
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">{t.money.connectedTo}</p>
            <code className="block truncate bg-slate-950/60 px-2 py-1 text-[11px] text-slate-400">{money.gas.url}</code>
            <SyncStatus money={money} t={t} />
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn btn-primary" onClick={money.syncNow}>{t.money.syncNow}</button>
              <button className="btn text-red-700" onClick={() => confirm(t.money.disconnectConfirm) && money.disconnect()}>{t.money.disconnect}</button>
            </div>
          </div>
        ) : (
          <form className="space-y-2" onSubmit={connect}>
            <p className="text-xs text-slate-400">{t.money.connectIntro}</p>
            <Field label={t.money.urlLabel}>
              <input className={inputCls} type="url" inputMode="url" autoCapitalize="none" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/…/exec" />
            </Field>
            <Field label={t.money.tokenLabel}>
              <input className={inputCls} type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} />
            </Field>
            {err && <p className="text-xs text-red-700" role="alert">{err}</p>}
            <button className="btn btn-primary min-h-11 w-full" disabled={!url || !token}>{t.money.connect}</button>
            <p className="text-[11px] text-slate-500">{t.money.mergeNote}</p>
          </form>
        )}
      </Panel>

      <Panel title={t.money.data} icon={Database} glow="gold">
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => download('expenses.csv', money.exportCsv())}>CSV</button>
          <button className="btn" onClick={() => download('expenses-backup.json', money.exportJson())}>{t.money.backup}</button>
          <button className="btn" onClick={() => file.current?.click()}>{t.money.restore}</button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={async e => {
            const f = e.target.files?.[0]
            if (!f) return
            try { money.importJson(await f.text()); alert(t.money.restored) } catch { alert(t.money.restoreBad) }
            e.target.value = ''
          }} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{t.money.dataNote}</p>
        <p className="mt-1 text-[11px] text-slate-500">{t.money.remindersNote}</p>
      </Panel>

      <Panel title={t.money.learned} icon={Brain} glow="emerald">
        <p className="mb-2 text-xs text-slate-400">{t.money.learnedDesc}</p>
        {learned.length === 0 ? <p className="text-xs text-slate-500">{t.money.learnedEmpty}</p> : (
          <ul className="sunken divide-y divide-slate-800">
            {learned.map(([k, v]) => (
              <li key={k} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{k}</span>
                <span className="max-w-[40%] truncate text-xs text-slate-500">→ {v}</span>
                <button className="p-1 text-slate-500 hover:text-red-700" aria-label={t.money.del} onClick={() => money.unlearn(k)}><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        {learned.length > 0 && <button className="btn mt-2 text-xs" onClick={() => confirm(t.money.learnedClear + '?') && money.clearLearned()}>{t.money.learnedClear}</button>}
      </Panel>
    </div>
  )
}
