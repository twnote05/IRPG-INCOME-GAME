import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_FUEL, blankMonth, carryMonth, dateInMonth, evalAmount, fuelCost, mergeBackup, mergeIntoRemote, monthOf, norm,
  OTHER, bucketTotals, goalProgress, logStreak, moneyRewards, parseQuick, todayISO, prevMonth, summarizeMoney, thisMonth, uid, validGasUrl, validMonth, withIds,
  type Bucket, type Fuel, type MoneyDb, type MonthPlan, type Row,
} from './logic'
import type { Payday } from '../lib/calendar'

// Same Google Sheet protocol as โปรเจค 2 (Code.gs): local-first, `save` rewrites the sheet with the
// whole document, so the sheet must be pulled (and merged) on this device before we ever push.
const K = {
  db: 'investor-rpg:money',
  dirty: 'investor-rpg:money.dirty',
  learn: 'investor-rpg:money.learn',
  goals: 'investor-rpg:money.goals', // savings targets per bucket name — device-local, like learned envelopes
  rest: 'investor-rpg:money.rest',
  payday: 'investor-rpg:money.payday', // day of month or 'last' working day — device-local // days marked "spent nothing" — device-local, never sent to the sheet
  month: 'investor-rpg:money.month',
  gas: 'investor-rpg:money.gas',
  pulled: 'investor-rpg:money.pulled', // sheet URL this device has pulled from — pushing is only allowed after that
}
function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v) } catch { return fallback }
}
function write(k: string, v: unknown) {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage blocked */ }
}

export interface GasConfig { url: string; token: string }
export type SyncState = { state: 'local' | 'syncing' | 'ok' | 'error'; at?: number; error?: string; added?: number }
type PlanKind = 'income' | 'plan' | 'buckets'

async function api<T>(cfg: GasConfig, action: string, extra: object = {}): Promise<T> {
  if (!validGasUrl(cfg.url)) throw new Error('bad url')
  const res = await fetch(cfg.url.trim(), {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' }, // text/plain avoids the CORS preflight GAS can't answer
    body: JSON.stringify({ action, token: cfg.token, ...extra }),
  })
  const d = await res.json()
  if (d.error) throw new Error(d.error)
  return d
}

export function useMoney() {
  const [db, setDb] = useState<MoneyDb>(() => read(K.db, { months: {}, entries: [] }))
  const [learned, setLearned] = useState<Record<string, string>>(() => read(K.learn, {}))
  const [goals, setGoals] = useState<Record<string, number>>(() => read(K.goals, {}))
  const [rest, setRest] = useState<string[]>(() => read(K.rest, []))
  const [payday, setPayday] = useState<Payday>(() => read(K.payday, 'last' as Payday))
  const [cur, setCur] = useState(() => { const m = read(K.month, ''); return validMonth(m) ? m : thisMonth() })
  const [gas, setGas] = useState<GasConfig | null>(() => read(K.gas, null))
  const [sync, setSync] = useState<SyncState>({ state: gas ? 'syncing' : 'local' })

  const dbRef = useRef(db)
  dbRef.current = db
  const gasRef = useRef(gas)
  gasRef.current = gas
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => write(K.db, db), [db])
  useEffect(() => write(K.learn, learned), [learned])
  useEffect(() => write(K.goals, goals), [goals])
  useEffect(() => write(K.rest, rest), [rest])
  useEffect(() => write(K.payday, payday), [payday])
  useEffect(() => write(K.month, cur), [cur])

  const canPush = (cfg = gasRef.current) => !!cfg && read(K.pulled, '') === cfg.url

  const pushUp = useCallback(async () => {
    const cfg = gasRef.current
    if (!cfg || !canPush(cfg)) return
    setSync(s => ({ ...s, state: 'syncing' }))
    try {
      await api(cfg, 'save', { doc: dbRef.current })
      write(K.dirty, null)
      setSync({ state: 'ok', at: Date.now() })
    } catch (e) {
      setSync({ state: 'error', error: (e as Error).message })
    }
  }, [])

  const markDirty = useCallback(() => {
    write(K.dirty, 1)
    if (!canPush()) return
    clearTimeout(timer.current)
    timer.current = window.setTimeout(pushUp, 1500) // batch rapid edits into one save
  }, [pushUp])

  /** First pull on this device: the sheet wins, local-only additions are merged on top, then pushed. */
  const connectMerge = useCallback(async (cfg: GasConfig) => {
    setSync({ state: 'syncing' })
    try {
      const remote = withIds(await api<MoneyDb>(cfg, 'load'))
      const { db: merged, added } = mergeIntoRemote(remote, dbRef.current)
      setDb(merged)
      write(K.pulled, cfg.url)
      write(K.dirty, null)
      setSync({ state: 'ok', at: Date.now(), added })
      if (added) markDirty()
    } catch (e) {
      setSync({ state: 'error', error: (e as Error).message })
    }
  }, [markDirty])

  const pullDown = useCallback(async () => {
    const cfg = gasRef.current
    if (!cfg) return
    if (!canPush(cfg)) return connectMerge(cfg)
    if (read(K.dirty, null)) return pushUp() // unsent edits go up first, or pulling would overwrite them
    setSync(s => ({ ...s, state: 'syncing' }))
    try {
      setDb(withIds(await api<MoneyDb>(cfg, 'load')))
      setSync({ state: 'ok', at: Date.now() })
    } catch (e) {
      setSync({ state: 'error', error: (e as Error).message })
    }
  }, [connectMerge, pushUp])

  // Pull on open and whenever the app comes back to the foreground (entries from the phone, iOS Shortcuts…)
  useEffect(() => {
    pullDown()
    const onVis = () => document.visibilityState === 'visible' && pullDown()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [pullDown])

  const connect = (cfg: GasConfig) => {
    const c = { url: cfg.url.trim(), token: cfg.token.trim() }
    write(K.gas, c)
    setGas(c)
    gasRef.current = c
    connectMerge(c)
  }
  const disconnect = () => {
    write(K.gas, null)
    write(K.pulled, null)
    setGas(null)
    setSync({ state: 'local' })
  }

  /** Edit a copy of the document; the viewed month is created on first edit. */
  const mutate = (fn: (d: MoneyDb, m: MonthPlan) => void) => {
    setDb(prev => {
      const d = structuredClone(prev)
      fn(d, (d.months[cur] ??= blankMonth()))
      return d
    })
    markDirty()
  }

  const month = db.months[cur]
  const planNames = useMemo(() => (month?.plan ?? []).map(p => p.name).filter(Boolean), [month])

  // ---------- log ----------
  /** `onToday`: the home screen always logs today, whatever month the log tab is showing. */
  const addQuick = (text: string, onToday = false) => {
    const e = parseQuick(text, planNames, learned)
    if (!e) return null
    const entry = { id: uid(), date: onToday ? todayISO() : dateInMonth(cur), ...e }
    mutate(d => { d.entries.unshift(entry) })
    return entry
  }
  const setEnv = (id: string, env: string) => {
    const note = db.entries.find(e => e.id === id)?.note
    mutate(d => { const e = d.entries.find(x => x.id === id); if (e) e.env = env })
    // remember where the user files this name; next time it lands there by itself
    if (note && env !== OTHER) setLearned(l => ({ ...l, [norm(note)]: env }))
  }
  const setAmount = (id: string, amount: number) => mutate(d => { const e = d.entries.find(x => x.id === id); if (e && amount > 0) e.amount = amount })
  const delEntry = (id: string) => mutate(d => { d.entries = d.entries.filter(e => e.id !== id) })

  // ---------- plan ----------
  const updateRow = (kind: PlanKind, id: string, patch: Partial<Row & Bucket>) => mutate((_, m) => {
    const list = m[kind] as (Row | Bucket)[]
    const r = list.find(x => x.id === id) as Record<string, unknown> | undefined
    if (!r) return
    for (const [k, v] of Object.entries(patch)) v === undefined ? delete r[k] : (r[k] = v)
  })
  const addRow = (kind: PlanKind) => mutate((_, m) => {
    if (kind === 'buckets') m.buckets.push({ id: uid(), name: '', pct: 0 })
    else m[kind].push({ id: uid(), name: '', amount: 0 })
  })
  const delRow = (kind: PlanKind, id: string) => mutate((_, m) => {
    (m[kind] as { id: string }[]).splice((m[kind] as { id: string }[]).findIndex(r => r.id === id), 1)
  })
  const addDebt = () => mutate((_, m) => { m.plan.push({ id: uid(), name: '', amount: 0, total: 0, n: 0, of: 12 }) })
  const carry = () => {
    const src = db.months[prevMonth(cur)]
    if (!src) return false
    mutate(d => { d.months[cur] = carryMonth(src) })
    return true
  }
  const setFuel = (k: keyof Fuel, v: number) => mutate((_, m) => { m.fuel = { ...DEFAULT_FUEL, ...m.fuel, [k]: v } })
  const applyFuel = (rowId: string) => mutate((_, m) => {
    const r = m.plan.find(p => p.id === rowId)
    if (r) r.amount = Math.round(fuelCost(m.fuel ?? DEFAULT_FUEL) * 100) / 100
  })

  // ---------- backup ----------
  const exportJson = () => JSON.stringify({ ...db, learn: learned, goals, rest }, null, 2)
  const exportCsv = () => '﻿date,type,envelope,note,amount\n' + db.entries.map(e =>
    [e.date, e.type, e.env, `"${String(e.note).replace(/"/g, '""')}"`, e.amount].join(',')).join('\n')
  const importJson = (text: string) => {
    const d = JSON.parse(text)
    const incoming = Array.isArray(d) ? d : withIds({ months: d.months || {}, entries: d.entries || [] })
    setDb(prev => mergeBackup(prev, incoming))
    if (!Array.isArray(d) && d.learn) setLearned(l => ({ ...d.learn, ...l }))
    if (!Array.isArray(d) && d.goals) setGoals(g => ({ ...d.goals, ...g }))
    if (!Array.isArray(d) && Array.isArray(d.rest)) setRest(r => [...new Set([...r, ...d.rest])])
    markDirty()
  }
  const unlearn = (k: string) => setLearned(l => { const n = { ...l }; delete n[k]; return n })
  const clearLearned = () => setLearned({})
  const setGoal = (name: string, target: number) => setGoals(g => {
    const n = { ...g }
    if (target > 0) n[name] = target; else delete n[name]
    return n
  })

  const months = useMemo(() => [...new Set([...Object.keys(db.months), ...db.entries.map(monthOf), cur, thisMonth()])]
    .filter(validMonth).sort().reverse(), [db, cur])
  const restToday = () => setRest(r => r.includes(todayISO()) ? r : [...r, todayISO()])
  const summary = useMemo(() => {
    const s = summarizeMoney(db)
    return { ...s, loggedToday: s.loggedToday || rest.includes(todayISO()), streak: logStreak(db.entries, new Date(), rest), rewards: moneyRewards(db, goals, rest, new Date(), payday) }
  }, [db, goals, rest, payday])
  const saved = useMemo(() => bucketTotals(db), [db])
  const goalList = useMemo(() => goalProgress(saved, goals), [saved, goals])

  return {
    db, cur, setCur, months, month, planNames, learned, summary, goals, goalList, saved, setGoal, rest, restToday, payday, setPayday,
    gas, sync, connect, disconnect, syncNow: () => (read(K.dirty, null) && canPush() ? pushUp() : pullDown()),
    addQuick, setEnv, setAmount, delEntry,
    updateRow, addRow, delRow, addDebt, carry, setFuel, applyFuel,
    exportJson, exportCsv, importJson, unlearn, clearLearned, evalAmount,
  }
}
export type Money = ReturnType<typeof useMoney>
