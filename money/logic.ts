// Income/expense ("money") logic, ported from โปรเจค 2 (รายรับรายจ่าย) with its behaviour kept.
// Pure functions only — the one runtime import (calendar.ts) is pure too, so `npm run check` runs this under plain Node.
// Data shape matches the Google Sheet backend (Code.gs), so both apps can share one sheet.

import { CNY, daysBetween, eventsOfYear, shiftDays, type Payday } from '../lib/calendar.ts'

export interface Row { id: string; name: string; amount: number; n?: number; of?: number; acct?: string; total?: number }
export interface Bucket { id: string; name: string; pct: number } // pct is a fraction: 0.27 = 27%
export interface Fuel { km: number; trips: number; kmpl: number; price: number; discount: number }
export interface MonthPlan { income: Row[]; plan: Row[]; buckets: Bucket[]; fuel?: Fuel }
export interface Entry { id: string; date: string; type: 'in' | 'out'; env: string; note: string; amount: number }
export interface MoneyDb { months: Record<string, MonthPlan>; entries: Entry[] }

// Envelope names are data stored in the sheet, not UI text — they stay Thai in both languages.
export const OTHER = 'อื่นๆ'
export const INCOME_ENV = 'รายรับ'

export const uid = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)

// ---------- dates / months ----------
export const todayISO = (d = new Date()) => d.toLocaleDateString('sv-SE')
export const thisMonth = (d = new Date()) => todayISO(d).slice(0, 7)
export const validMonth = (m: unknown) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m ?? ''))
export const prevMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`
}
export const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}
export const daysInMonth = (m: string) => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate()
export const yearMonths = (y: string) => Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)
export const monthOf = (e: { date?: string }) => String(e.date || '').slice(0, 7)

/** An entry logged while viewing another month lands in that month, on today's day number (clamped). */
export function dateInMonth(m: string, now = new Date()) {
  const today = todayISO(now)
  if (m === today.slice(0, 7)) return today
  return `${m}-${String(Math.min(now.getDate(), daysInMonth(m))).padStart(2, '0')}`
}

// ---------- amounts ----------
/** Amount fields accept arithmetic (the old sheet had "=100*30"). Digits and operators only. */
export function evalAmount(s: string | number): number {
  const t = String(s).replace(/[,\s฿]/g, '')
  if (!t) return 0
  if (!/^[0-9+\-*/().]+$/.test(t)) return NaN
  try {
    const v = Function(`"use strict";return(${t})`)()
    return Number.isFinite(v) ? v : NaN
  } catch { return NaN }
}
export const sum = <T,>(arr: T[], f: (x: T) => unknown = (x: any) => x.amount) => arr.reduce((a, x) => a + (+(f(x) as number) || 0), 0)

// ---------- auto-categorization ----------
// Hints are tied to meaning, then matched against whatever envelope names the user chose.
const HINTS = [
  { keys: ['ข้าว', 'กาแฟ', 'อาหาร', 'ร้าน', 'กิน', 'ก๋วยเตี๋ยว', 'ขนม', 'น้ำเปล่า', 'น้ำดื่ม', 'ชาเย็น', 'ชานม', 'เซเว่น', '7-11', 'โลตัส', 'บิ๊กซี', 'แม็คโคร', 'lineman', 'grab food', 'หมูกระทะ', 'ชาบู', 'ส้มตำ', 'หมูปิ้ง', 'ไข่', 'นม'], match: ['กิน', 'อาหาร', 'ข้าว'] },
  { keys: ['น้ำมัน', 'แก๊ส', 'ptt', 'บางจาก', 'shell', 'esso', 'เติมรถ', 'ค่ารถ', 'แท็กซี่', 'taxi', 'grab', 'bolt', 'bts', 'mrt', 'วิน', 'ทางด่วน', 'ที่จอดรถ', 'ตั๋ว'], match: ['เดินทาง', 'น้ำมัน', 'แก๊ส', 'รถ'] },
  { keys: ['ค่าไฟ', 'การไฟฟ้า', 'ไฟฟ้า', 'mea', 'pea'], match: ['ไฟ'] },
  { keys: ['ค่าน้ำ', 'ประปา'], match: ['น้ำประปา', 'ประปา'] },
  { keys: ['ค่าโทร', 'true', 'ais', 'dtac', 'เน็ต', 'อินเทอร์เน็ต', 'wifi'], match: ['โทรศัพท์', 'เน็ต', 'สื่อสาร'] },
  { keys: ['ยา', 'หมอ', 'คลินิก', 'โรงพยาบาล', 'ทำฟัน', 'แว่น', 'ฟิตเนส', 'ยิม'], match: ['สุขภาพ', 'รักษา'] },
  { keys: ['หนัง', 'เกม', 'คอนเสิร์ต', 'เที่ยว', 'โรงแรม', 'เบียร์', 'เหล้า', 'steam', 'netflix', 'spotify'], match: ['บันเทิง', 'เที่ยว', 'สื่อ'] },
  { keys: ['shopee', 'ช้อปปี้', 'lazada', 'ลาซาด้า', 'ช้อป', 'เสื้อ', 'รองเท้า', 'tiktok'], match: ['ช้อป', 'ซื้อของ'] },
]
const INCOME_WORDS = ['เงินเดือน', 'รายรับ', 'โบนัส', 'ขายของ', 'ได้เงิน', 'ค่าจ้าง', 'ดอกเบี้ย', 'คืนเงิน', 'เงินเข้า', 'โอนเข้า']
export const norm = (s: string) => String(s).toLowerCase().trim().replace(/\s+/g, ' ')

/** Envelope for an entry, most confident first: 1. learned  2. name matches an envelope  3. meaning hint. */
export function guessEnv(note: string, planNames: string[], learned: Record<string, string> = {}) {
  const s = norm(note)
  if (!s) return OTHER
  if (learned[s] && planNames.includes(learned[s])) return learned[s]
  for (const [k, v] of Object.entries(learned))
    if (planNames.includes(v) && k.length >= 2 && (s.includes(k) || k.includes(s))) return v
  for (const n of planNames) {
    const ln = norm(n)
    if (ln && (s.includes(ln) || ln.includes(s))) return n
  }
  for (const h of HINTS) {
    if (!h.keys.some(w => s.includes(w))) continue
    const hit = planNames.find(n => h.match.some(mk => norm(n).includes(mk)))
    if (hit) return hit
  }
  return OTHER
}

/** "กาแฟ 120" | "120 กาแฟ" | "+30000 เงินเดือน" | "ค่าไฟ 1,250.50" */
export function parseQuick(text: string, planNames: string[] = [], learned: Record<string, string> = {}) {
  const s = String(text).trim()
  if (!s) return null
  const m = s.match(/([+-]?)\s*(\d[\d,]*(?:\.\d+)?)/)
  if (!m || m.index === undefined) return null
  const amount = parseFloat(m[2].replace(/,/g, ''))
  if (!(amount > 0)) return null
  let note = (s.slice(0, m.index) + s.slice(m.index + m[0].length)).trim()
  const lead = note.startsWith('+') // "+เงินเดือน 30000": a leading + means income too, not part of the name
  if (lead) note = note.slice(1).trim()
  note ||= 'ไม่ระบุ'
  const income = m[1] === '+' || lead || INCOME_WORDS.some(w => note.includes(w))
  return { amount, note, type: (income ? 'in' : 'out') as Entry['type'], env: income ? INCOME_ENV : guessEnv(note, planNames, learned) }
}

// ---------- plan maths ----------
export const alloc = (left: number, buckets: Bucket[]) => buckets.map(b => ({ ...b, baht: left > 0 ? left * (+b.pct || 0) : 0 }))
export function fuelCost(f: Partial<Fuel>) {
  const litres = (+(f.km ?? 0) || 0) * (+(f.trips ?? 0) || 0) / (+(f.kmpl ?? 0) || 1)
  return Math.max(0, litres * (+(f.price ?? 0) || 0) - (+(f.discount ?? 0) || 0))
}
export const DEFAULT_FUEL: Fuel = { km: 0, trips: 0, kmpl: 9.8, price: 0, discount: 0 }
export function byAccount(plan: Row[]) {
  const g: Record<string, number> = {}
  for (const p of plan) g[p.acct || '—'] = (g[p.acct || '—'] || 0) + (+p.amount || 0)
  return Object.entries(g).sort((a, b) => Number(a[0] === '—') - Number(b[0] === '—') || b[1] - a[1])
}
/** A half-filled installment (has "of" but no "n" yet) counts as period 0 instead of breaking. */
export const periodN = (it: { n?: number | string }) => Math.max(0, Math.round(+(it.n ?? 0) || 0))
export const isDebt = (r: Row) => !!(r.of || r.total)
export function nextPeriod(it: Row): Row | null {
  if (!it.of) return { ...it, id: uid() }
  const n = periodN(it)
  if (n >= it.of) return null
  return { ...it, id: uid(), n: n + 1 }
}
export function payoffMonth(item: { n?: number; of?: number }, month: string) {
  if (!item.of) return null
  let k = month
  for (let i = 0; i < Math.max(0, item.of - periodN(item)); i++) k = nextMonth(k)
  return k
}
/** Warn before the money runs out: at 80% there's still time to adjust. */
export const WARN_AT = 0.8
export type BudgetState = 'ok' | 'warn' | 'over'
export function budgetState(actual: number, planned: number): BudgetState {
  if (!(planned > 0)) return actual > 0 ? 'over' : 'ok'
  const r = actual / planned
  return r > 1 ? 'over' : r >= WARN_AT ? 'warn' : 'ok'
}
/** Unspent plan ÷ days left in the month (today included). Other months divide by the whole month. */
export function dailyBudget(planned: number, spent: number, month: string, today: string) {
  const days = daysInMonth(month)
  const daysLeft = today.slice(0, 7) === month ? Math.max(1, days - +today.slice(8, 10) + 1) : days
  const left = planned - spent
  return { daysLeft, left, perDay: left > 0 ? left / daysLeft : 0 }
}
export const vsPlan = (plan: Row[], spentOf: (name: string) => number) => plan
  .filter(p => p.name)
  .map(p => ({ name: p.name, planned: +p.amount || 0, actual: spentOf(p.name) }))
  .map(r => ({ ...r, diff: r.actual - r.planned }))
  .sort((a, b) => b.diff - a.diff)

/** Donut data: at most 6 slices, the rest folded into one — beyond that neighbouring colors blur. */
export const PIE_MAX = 6
export function pieData(rows: { label: string; value: number }[], otherLabel = (n: number) => `${OTHER} (${n})`) {
  const all = rows.filter(r => r.value > 0).sort((a, b) => b.value - a.value)
  const total = sum(all, r => r.value)
  if (!total) return { total: 0, slices: [] as { label: string; value: number; pct: number }[] }
  const top = all.slice(0, PIE_MAX)
  const rest = all.slice(PIE_MAX)
  if (rest.length) top.push({ label: otherLabel(rest.length), value: sum(rest, r => r.value) })
  return { total, slices: top.map(r => ({ ...r, pct: r.value / total * 100 })) }
}

export const blankMonth = (): MonthPlan => ({
  income: [{ id: uid(), name: 'เงินเดือน', amount: 0 }],
  plan: [],
  buckets: [{ id: uid(), name: 'ทุนสำรอง', pct: 0.3 }, { id: uid(), name: 'ลงทุน DCA', pct: 0.3 }, { id: uid(), name: 'เผื่อใช้เล่น', pct: 0.4 }],
  fuel: { ...DEFAULT_FUEL },
})

/** New month copied from the previous one: installments advance a period, finished ones drop off. */
export function carryMonth(src: MonthPlan): MonthPlan {
  return {
    income: src.income.map(r => ({ ...r, id: uid() })),
    buckets: src.buckets.map(r => ({ ...r, id: uid() })),
    plan: src.plan.map(nextPeriod).filter((r): r is Row => !!r),
    ...(src.fuel ? { fuel: { ...src.fuel } } : {}),
  }
}

// ---------- sheet sync ----------
export const validGasUrl = (u: string) => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(\?.*)?$/.test(String(u).trim())
export const looksLikeToken = (t: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(t).trim())

/** The sheet drops row ids for plan lines; give them fresh ones so React/edits can track rows. */
export function withIds(remote: MoneyDb): MoneyDb {
  const months: Record<string, MonthPlan> = {}
  for (const [k, m] of Object.entries(remote.months || {})) {
    if (!validMonth(k)) continue
    months[k] = {
      income: (m.income || []).map(r => ({ ...r, id: uid() })),
      plan: (m.plan || []).map(r => ({ ...r, id: uid() })),
      buckets: (m.buckets || []).map(r => ({ ...r, id: uid() })),
      ...(m.fuel ? { fuel: m.fuel } : {}),
    }
  }
  return { months, entries: (remote.entries || []).map(e => ({ ...e, id: String(e.id) })) }
}

/**
 * First connect on this device: the sheet wins, and anything logged here before connecting is
 * added on top — local entries not in the sheet, and plans only for months the sheet doesn't have.
 * This is what stops an empty new device from wiping months of plans with its first save.
 */
export function mergeIntoRemote(remote: MoneyDb, local: MoneyDb): { db: MoneyDb; added: number } {
  const have = new Set(remote.entries.map(e => e.id))
  const extra = local.entries.filter(e => !have.has(e.id))
  const newMonths = Object.keys(local.months).filter(k => !remote.months[k] && hasPlan(local.months[k]))
  return {
    db: {
      months: { ...remote.months, ...Object.fromEntries(newMonths.map(k => [k, local.months[k]])) },
      entries: [...remote.entries, ...extra].sort((a, b) => b.date.localeCompare(a.date)),
    },
    added: extra.length + newMonths.length,
  }
}
const hasPlan = (m: MonthPlan) => m.plan.length > 0 || sum(m.income) > 0

/** Backup restore: add what's missing, never overwrite what's already here. */
export function mergeBackup(db: MoneyDb, incoming: Partial<MoneyDb> | Entry[]): MoneyDb {
  const inc = Array.isArray(incoming) ? { months: {}, entries: incoming } : incoming
  const have = new Set(db.entries.map(e => e.id))
  return {
    months: { ...(inc.months || {}), ...db.months },
    entries: [...db.entries, ...(inc.entries || []).filter(e => !have.has(e.id))].sort((a, b) => b.date.localeCompare(a.date)),
  }
}

// ---------- what the investing side (RPG) needs ----------
const INVEST_BUCKET = /ลงทุน|invest|dca|หุ้น|กองทุน|เกษียณ/i

export function summarizeMoney(db: MoneyDb, now = new Date()) {
  const today = todayISO(now)
  const month = today.slice(0, 7)
  const flow = (m: string, type: Entry['type']) => sum(db.entries.filter(e => e.type === type && e.date.startsWith(m)))

  // Planned income for this month, else the latest earlier month that has one, else logged income
  const withIncome = Object.keys(db.months).filter(m => m <= month).sort().reverse().find(m => sum(db.months[m].income) > 0)
  const plan = db.months[month]
  const income = withIncome ? sum(db.months[withIncome].income) : flow(month, 'in')
  const planned = plan ? sum(plan.plan) : 0

  // Typical monthly spending: average of the last 3 completed months that have entries
  const past = [...new Set(db.entries.filter(e => e.type === 'out' && monthOf(e) < month).map(monthOf))].sort().slice(-3)
  const avgExpense = past.length ? sum(past, m => flow(m, 'out')) / past.length : planned

  // DCA budget = the investing buckets' share of what's left after committed spending
  const buckets = (plan ?? (withIncome ? db.months[withIncome] : undefined))?.buckets ?? []
  const investFrac = sum(buckets.filter(b => INVEST_BUCKET.test(b.name)), b => b.pct)
  const left = income - (plan ? planned : withIncome ? sum(db.months[withIncome].plan) : 0)

  return {
    month, income, planned, spent: flow(month, 'out'),
    investPct: Math.round(investFrac * 1000) / 10,
    investBudget: Math.round(Math.max(0, left) * investFrac),
    avgExpense: Math.round(avgExpense),
    loggedToday: db.entries.some(e => e.date === today),
  }
}
export type MoneySummary = ReturnType<typeof summarizeMoney>

// ---------- game layer ----------
/** Consecutive days with at least one entry, ending today (or yesterday — today isn't over yet). */
export function logStreak(entries: Entry[], now = new Date(), rest: string[] = []) {
  const days = new Set([...entries.map(e => e.date), ...rest])
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(todayISO(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(todayISO(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

/** Baht each bucket has been allocated, summed over the given months (what the plan says was set aside). */
export function bucketTotals(db: MoneyDb, monthKeys = Object.keys(db.months)) {
  const tot: Record<string, number> = {}
  for (const k of monthKeys) {
    const m = db.months[k]
    if (!m) continue
    for (const b of alloc(sum(m.income) - sum(m.plan), m.buckets)) if (b.name) tot[b.name] = (tot[b.name] || 0) + b.baht
  }
  return tot
}

/** Savings goals: target per bucket name (kept on this device, like learned envelopes). */
export function goalProgress(totals: Record<string, number>, goals: Record<string, number>) {
  return Object.entries(goals).filter(([, target]) => target > 0).map(([name, target]) => {
    const saved = totals[name] || 0
    return { name, target, saved, pct: Math.min(100, saved / target * 100), reached: saved >= target }
  }).sort((a, b) => Number(a.reached) - Number(b.reached) || b.pct - a.pct)
}

/** Longest run of consecutive days in a set of YYYY-MM-DD dates. */
export function bestStreak(dates: Iterable<string>) {
  const ds = [...new Set(dates)].sort()
  let best = 0, run = 0, prev = ''
  for (const d of ds) {
    const [y, m, dd] = d.split('-').map(Number)
    run = prev && todayISO(new Date(y, m - 1, dd - 1)) === prev ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/**
 * Each day of a month as a fight: the day's HP is the unspent plan ÷ days left (today included),
 * and spending that day is damage. `active` = something was logged, or the day was marked no-spend.
 */
export function dayLog(db: MoneyDb, m: string, planned: number, rest: string[] = []) {
  const out: Record<string, number> = {}
  const active = new Set(rest.filter(d => d.startsWith(m)))
  for (const e of db.entries) {
    if (!e.date.startsWith(m)) continue
    active.add(e.date)
    if (e.type === 'out') out[e.date] = (out[e.date] || 0) + (+e.amount || 0)
  }
  const days = daysInMonth(m)
  let before = 0
  return Array.from({ length: days }, (_, i) => {
    const date = `${m}-${String(i + 1).padStart(2, '0')}`
    const max = Math.max(0, planned - before) / (days - i)
    const spent = out[date] || 0
    before += spent
    return { date, max, spent, hp: max - spent, active: active.has(date) }
  })
}

/** A month's envelopes as monsters: HP = what's left of each envelope's plan. */
export const monsters = (plan: Row[], spentOf: (name: string) => number) => plan
  .filter(p => p.name && !isDebt(p))
  .map(p => {
    const max = +p.amount || 0, spent = spentOf(p.name)
    return { name: p.name, max, spent, hp: Math.max(0, max - spent), state: budgetState(spent, max) }
  })

// ---------- weeks ----------
export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return todayISO(new Date(y, m - 1, d + n))
}
/** Monday of the week containing `iso`. */
export const weekStart = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return addDays(iso, -((new Date(y, m - 1, d).getDay() + 6) % 7))
}
/** Day records (HP, spent, active) across a date range; each month uses its own plan. */
export function dayRange(db: MoneyDb, from: string, to: string, rest: string[] = []) {
  const out: ReturnType<typeof dayLog> = []
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = nextMonth(m))
    out.push(...dayLog(db, m, sum(db.months[m]?.plan ?? []), rest).filter(d => d.date >= from && d.date <= to))
  return out
}
/** "No-spend" days only count while they really have no spending. */
export const validRest = (db: MoneyDb, rest: string[]) => {
  const spent = new Set(db.entries.filter(e => e.type === 'out').map(e => e.date))
  return rest.filter(d => !spent.has(d))
}

/** The last 7 days (today included) as a battle report. */
export function battleLog(db: MoneyDb, rest: string[] = [], today = todayISO()) {
  const from = addDays(today, -6)
  const rs = validRest(db, rest)
  const days = dayRange(db, from, today, rs)
  const outs = db.entries.filter(e => e.type === 'out' && e.date >= from && e.date <= today)
  const env: Record<string, number> = {}
  for (const e of outs) env[e.env] = (env[e.env] || 0) + (+e.amount || 0)
  const top = Object.entries(env).sort((a, b) => b[1] - a[1])[0]
  const big = [...outs].sort((a, b) => b.amount - a.amount)[0]
  return {
    from, spent: sum(outs), hits: outs.length,
    active: days.filter(d => d.active).length,
    good: days.filter(d => d.date < today && d.active && d.hp >= 0).length,
    hurt: days.filter(d => d.date < today && d.hp < 0).length,
    rest: days.filter(d => rs.includes(d.date)).length,
    income: sum(db.entries.filter(e => e.type === 'in' && e.date >= from && e.date <= today)),
    top: top ? { name: top[0], amount: top[1] } : null,
    biggest: big ? { note: big.note, amount: +big.amount || 0 } : null,
  }
}

// Weekly challenge: one per week, picked from the week's Monday so every device agrees.
const DRINK = /กาแฟ|coffee|ชานม|ชาเย็น|ชาไข่มุก|ชาไทย|starbucks|amazon|cafe|คาเฟ่/i
export const CHALLENGES = ['log5', 'rest2', 'good4', 'noDrink', 'under'] as const
export type Challenge = typeof CHALLENGES[number]
export const CHALLENGE_GOAL: Record<Challenge, number> = { log5: 5, rest2: 2, good4: 4, noDrink: 3, under: 1 }
/** Share of the week's HP you may spend in the "under" challenge. */
export const UNDER_SHARE = 0.9

export function weekChallenge(db: MoneyDb, start: string, rest: string[] = [], today = todayISO()) {
  const key = [...start].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0
  const id = CHALLENGES[key % CHALLENGES.length]
  const end = addDays(start, 6)
  const rs = validRest(db, rest)
  const days = dayRange(db, start, end < today ? end : today, rs)
  const done = days.filter(d => d.date < today) // finished days: today can still change
  const drink = new Set(db.entries.filter(e => e.type === 'out' && DRINK.test(e.note)).map(e => e.date))
  const n = id === 'log5' ? days.filter(d => d.active).length
    : id === 'rest2' ? days.filter(d => rs.includes(d.date)).length
    : id === 'good4' ? done.filter(d => d.active && d.hp >= 0).length
    : id === 'noDrink' ? done.filter(d => d.active && !drink.has(d.date)).length
    : Number(end < today && done.filter(d => d.active).length >= 3 && sum(done, d => d.max) > 0
      && sum(done, d => d.spent) <= sum(done, d => d.max) * UNDER_SHARE)
  const goal = CHALLENGE_GOAL[id]
  return { id, start, end, n: Math.min(n, goal), goal, done: n >= goal }
}

export type RewardKind = 'day' | 'dungeon' | 'debt' | 'chest' | 'ach' | 'loot' | 'challenge' | 'sale' | 'trip' | 'angpao'
export interface Reward { id: string; kind: RewardKind; arg: string; exp: number; gold: number }
export const REWARD: Record<RewardKind, [exp: number, gold: number]> = {
  day: [20, 5], dungeon: [300, 80], debt: [1000, 250], chest: [50, 15], ach: [200, 50], loot: [50, 20], challenge: [150, 40],
  sale: [300, 80], trip: [200, 50], angpao: [100, 88],
}
export const CHEST_STEPS = [25, 50, 75, 100]
export const ACHIEVEMENTS = ['first', 'streak7', 'streak30', 'rest', 'clean', 'freedom', 'goal'] as const
export type Achievement = typeof ACHIEVEMENTS[number]

/**
 * Everything the money side has earned so far, derived from the data alone (so it's the same on
 * every device). The game grants each id once and remembers it. Spending money never earns anything.
 */
export const TRIP_GOAL = /เที่ยว|trip|travel|สงกรานต์|ปีใหม่|holiday/i
export const TRIP_WINDOW = 30 // days before Songkran / New Year that a trip fund counts

export function moneyRewards(db: MoneyDb, goals: Record<string, number>, rest: string[] = [], now = new Date(), pay?: Payday): Reward[] {
  const today = todayISO(now), month = today.slice(0, 7)
  const r: Reward[] = []
  const add = (kind: RewardKind, arg: string, mult = 1) =>
    r.push({ id: `${kind}:${arg}`, kind, arg, exp: REWARD[kind][0] * mult, gold: REWARD[kind][1] * mult })
  const outs = db.entries.filter(e => e.type === 'out')
  const restDays = validRest(db, rest)

  // Good days (this month, finished days only): showed up and stayed within the day's HP
  const cm = db.months[month]
  if (cm && sum(cm.plan) > 0)
    for (const d of dayLog(db, month, sum(cm.plan), restDays)) if (d.date < today && d.active && d.hp >= 0) add('day', d.date)

  // Dungeons: finished months with a plan and spending, where no envelope and not the total went over
  let clean = false
  for (const [k, m] of Object.entries(db.months)) {
    const mo = outs.filter(e => e.date.startsWith(k))
    if (k >= month || !(sum(m.plan) > 0) || !mo.length || sum(mo) > sum(m.plan)) continue
    if (monsters(m.plan, n => sum(mo.filter(e => e.env === n))).every(x => x.state !== 'over')) { add('dungeon', k); clean = true }
  }

  // Debt dragons: slain once any month shows the last installment
  const slain = new Set<string>()
  for (const [k, m] of Object.entries(db.months))
    if (k <= month) for (const p of m.plan) if (p.name && p.of && periodN(p) >= p.of) slain.add(p.name)
  for (const n of slain) add('debt', n)

  // Treasure chests: each quarter of a savings goal opens one, the last one is worth more
  let reached = false
  for (const g of goalProgress(bucketTotals(db), goals))
    for (const step of CHEST_STEPS) if (g.pct >= step) { add('chest', `${g.name}:${step}`, step === 100 ? 4 : 1); reached ||= step === 100 }

  // Payday loot: the month's income logged — triple when the plan sends a share to an investing bucket
  for (const k of new Set(db.entries.filter(e => e.type === 'in').map(monthOf)))
    if (validMonth(k) && k <= month) add('loot', k, sum((db.months[k]?.buckets ?? []).filter(b => INVEST_BUCKET.test(b.name)), b => b.pct) > 0 ? 3 : 1)

  // Weekly challenges: this week's once done, last week's if it was done by the end
  const wk = weekStart(today)
  for (const s of [addDays(wk, -7), wk]) if (weekChallenge(db, s, restDays, today).done) add('challenge', s)

  // Festivals (this year and last, so a recent one still pays out)
  const y = +today.slice(0, 4)
  const events = [...eventsOfYear(y - 1, pay), ...eventsOfYear(y, pay)]
  // Sale boss: a finished 9.9 / 10.10 / 11.11 / 12.12 you logged and stayed within the day's HP
  for (const e of events.filter(e => e.kind === 'sale' && e.date < today && daysBetween(e.date, today) <= 60)) {
    const m = db.months[e.date.slice(0, 7)]
    const d = m && sum(m.plan) > 0 ? dayLog(db, e.date.slice(0, 7), sum(m.plan), restDays).find(x => x.date === e.date) : undefined
    if (d?.active && d.hp >= 0) add('sale', e.date)
  }
  // Trip quest: a travel savings goal at least half full in the month before Songkran / New Year
  const trip = goalProgress(bucketTotals(db), goals).some(g => TRIP_GOAL.test(g.name) && g.pct >= 50)
  for (const e of events.filter(e => e.id === 'songkran' || e.id === 'newyear'))
    if (trip && today <= e.date && daysBetween(today, e.date) <= TRIP_WINDOW) add('trip', `${e.id}:${e.date.slice(0, 4)}`)
  // Ang pao: income logged around Chinese New Year
  for (const yy of [y - 1, y]) {
    const cny = CNY[yy] && `${yy}-${CNY[yy]}`
    if (cny && db.entries.some(e => e.type === 'in' && e.date >= shiftDays(cny, -3) && e.date <= shiftDays(cny, 7) && e.date <= today)) add('angpao', String(yy))
  }

  const best = bestStreak([...db.entries.map(e => e.date), ...restDays])
  const got: Record<Achievement, boolean> = {
    first: db.entries.length > 0, streak7: best >= 7, streak30: best >= 30, rest: restDays.length > 0,
    clean, freedom: slain.size > 0, goal: reached,
  }
  for (const a of ACHIEVEMENTS) if (got[a]) add('ach', a)
  return r
}
