// Income/expense ("money") logic, ported from โปรเจค 2 (รายรับรายจ่าย) with its behaviour kept.
// Pure functions only, so `npm run check` runs this under plain Node.
// Data shape matches the Google Sheet backend (Code.gs), so both apps can share one sheet.

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
/** Normalised notes of the month's 'out' entries that name a plan row (amount irrelevant; blank rows never match). */
export function paidNames(db: MoneyDb, month: string): Set<string> {
  const names = new Set((db.months[month]?.plan ?? []).filter(r => r.name.trim()).map(r => norm(r.name)))
  const paid = new Set<string>()
  for (const e of db.entries) {
    if (e.type !== 'out' || monthOf(e) !== month) continue
    const n = norm(e.note)
    if (names.has(n)) paid.add(n)
  }
  return paid
}
export const isPaid = (row: Row, paid: Set<string>) => !!row.name.trim() && paid.has(norm(row.name))
/** Newest matching 'out' entry id in the month (by date; entries are stored newest-first, so on a date tie the first match in array order is the most recently logged), or null. */
export function paidEntryId(db: MoneyDb, month: string, name: string): string | null {
  if (!name.trim()) return null
  let best: Entry | null = null
  for (const e of db.entries)
    if (e.type === 'out' && monthOf(e) === month && norm(e.note) === norm(name) && (!best || e.date > best.date)) best = e
  return best ? best.id : null
}

export interface Spendable {
  hasPlan: boolean
  income: number
  committed: number
  discretionary: number
  left: number
  daysLeft: number
  perDay: number
}
export function spendable(db: MoneyDb, month: string, today: string): Spendable {
  const m = db.months[month]
  const ins = m?.income ?? []
  const inMonth = db.entries.filter(e => monthOf(e) === month)
  const income = ins.length ? sum(ins) : sum(inMonth.filter(e => e.type === 'in'))
  const committed = sum(m?.plan ?? [])
  const paid = paidNames(db, month)
  const discretionary = sum(inMonth.filter(e => e.type === 'out' && !paid.has(norm(e.note))))
  const left = income - committed - discretionary
  const dim = daysInMonth(month)
  const daysLeft = today.slice(0, 7) === month ? Math.max(1, dim - +today.slice(8, 10) + 1) : dim
  return {
    hasPlan: ins.length > 0 || (m?.plan.length ?? 0) > 0,
    income, committed, discretionary, left, daysLeft,
    perDay: left > 0 ? left / daysLeft : 0,
  }
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

// ---------- goals ----------
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
/** "No-spend" days only count while they really have no spending. */
export const validRest = (db: MoneyDb, rest: string[]) => {
  const spent = new Set(db.entries.filter(e => e.type === 'out').map(e => e.date))
  return rest.filter(d => !spent.has(d))
}

// ---------- summary data (spending only: type === 'out') ----------
const outs = (db: MoneyDb) => db.entries.filter(e => e.type === 'out')
/** Mon..Sun of the week containing `today`, spent per day. */
export const weekDays = (db: MoneyDb, today: string) => {
  const o = outs(db)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart(today), i)
    return { date, total: sum(o.filter(e => e.date === date)) }
  })
}
/** Jan..Dec of `year`, spent per month (0 when empty). */
export const monthTotals = (db: MoneyDb, year: string) => {
  const o = outs(db)
  return yearMonths(year).map(month => ({ month, total: sum(o.filter(e => monthOf(e) === month)) }))
}
/** Spent per envelope in a month, biggest first. */
export function envTotals(db: MoneyDb, month: string) {
  const g: Record<string, number> = {}
  for (const e of outs(db)) if (monthOf(e) === month) g[e.env] = (g[e.env] || 0) + (+e.amount || 0)
  return Object.entries(g).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}
/** ISO date -> spent, for one month. */
export function dayTotals(db: MoneyDb, month: string) {
  const g: Record<string, number> = {}
  for (const e of outs(db)) if (monthOf(e) === month) g[e.date] = (g[e.date] || 0) + (+e.amount || 0)
  return g
}
