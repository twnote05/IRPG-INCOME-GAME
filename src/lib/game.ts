import type { Asset, Category, GameState, GearSlot, Horizon, Job, Look, Period, Realm } from '../types'
import type { SpriteName } from './sprites'

export const REALM_KEYS: Realm[] = ['domestic', 'international', 'alternative', 'cash']
const REALM_HEX: Record<Realm, { light: string; dark: string }> = {
  domestic: { light: '#b45309', dark: '#fbbf24' },
  international: { light: '#1d4ed8', dark: '#60a5fa' },
  alternative: { light: '#7e22ce', dark: '#c084fc' },
  cash: { light: '#047857', dark: '#34d399' },
}
export const realmHex = (r: Realm, dark: boolean) => REALM_HEX[r][dark ? 'dark' : 'light']

export const CATEGORIES: Category[] = [
  'Index ETF', 'Individual Stock', 'Bond', 'REIT', 'Dividend Stock', 'Crypto', 'Gold', 'Money Market',
]

export const HORIZONS: Horizon[] = ['short', 'medium', 'long']
/** Common Thai apps/brokers — suggestions only, any name can be typed. */
export const PLATFORMS = ['Dime', 'InnovestX', 'Streaming', 'Pi', 'Webull', 'Bitkub', 'Binance TH', 'FINNOMENA', 'K-My Invest', 'SCB Easy', 'Krungthai NEXT', 'ออมทอง (ร้านทอง)']

/** Current value grouped by horizon; assets without one go under "unset". */
export function byHorizon(assets: Asset[]) {
  const out: Record<Horizon | 'unset', { value: number; invested: number; count: number }> = {
    short: { value: 0, invested: 0, count: 0 }, medium: { value: 0, invested: 0, count: 0 },
    long: { value: 0, invested: 0, count: 0 }, unset: { value: 0, invested: 0, count: 0 },
  }
  for (const a of assets) {
    const g = out[a.horizon ?? 'unset']
    g.value += a.currentValue; g.invested += a.invested; g.count++
  }
  return out
}

export interface Quest { id: string; period: Period; exp: number; gold: number; int?: boolean }
export const QUESTS: Quest[] = [
  { id: 'expenses', period: 'daily', exp: 50, gold: 10 },
  { id: 'news', period: 'daily', exp: 50, gold: 10, int: true },
  { id: 'ratio', period: 'weekly', exp: 150, gold: 30, int: true },
  { id: 'dca', period: 'weekly', exp: 500, gold: 100 },
  { id: 'review', period: 'quarterly', exp: 300, gold: 60, int: true },
  { id: 'tax', period: 'yearly', exp: 400, gold: 100, int: true }, // PVD / SSF / RMF / insurance deductions before year end
]

/**
 * Jobs = how real income arrives. Each changes the emergency-fund target (HP) and boosts one kind of
 * reward (money-side reward kinds, 'boss' = payday boss, 'int' = knowledge quests).
 */
export const JOBS: Record<Job, { months: number; sprite: 'shield' | 'sword' | 'stall' | 'castle' | 'book'; boost: Record<string, number>; insurance?: number }> = {
  salaried: { months: 6, sprite: 'shield', boost: { boss: 1.5 } },
  freelance: { months: 9, sprite: 'sword', boost: { loot: 2 } },
  merchant: { months: 9, sprite: 'stall', boost: { chest: 1.5 } },
  guardian: { months: 6, sprite: 'castle', boost: { dungeon: 1.5 }, insurance: 40 },
  apprentice: { months: 3, sprite: 'book', boost: { int: 1.5 } },
}
export const JOB_KEYS = Object.keys(JOBS) as Job[]
export const jobOf = (s: GameState) => JOBS[s.profile.job ?? 'salaried']
export const boost = (s: GameState, key: string) => jobOf(s).boost[key] ?? 1
export const boosted = (r: { exp: number; gold: number }, m: number) => ({ exp: Math.round(r.exp * m), gold: Math.round(r.gold * m) })
export const questReward = (s: GameState, q: Quest) => boosted(q, q.int ? boost(s, 'int') : 1)

/** Career rank from level; "free" once 4% a year of net worth covers monthly spending. */
export const RANKS = [[0, 'intern'], [5, 'junior'], [10, 'senior'], [20, 'lead'], [30, 'manager'], [50, 'director']] as const
export type Rank = typeof RANKS[number][1] | 'free'
export const SAFE_WITHDRAWAL = 0.04
export const rankFor = (level: number, fire: boolean): Rank => (fire ? 'free' : [...RANKS].reverse().find(([lv]) => level >= lv)![1])

// Rules below follow the beginner guide in ความรู้การลงทุน/ (Thai-first, then expand abroad).
/** Beginners start Thai-heavy (80:20 → 70:30) and shift abroad as experience (level) grows. */
export const targetForeignPct = (level: number) => (level < 10 ? 20 : level < 20 ? 30 : 40)
/** No single name should exceed 10–15% of the portfolio. Index funds/ETFs are already diversified. */
export const CONCENTRATION_LIMIT = 15
const SINGLE_NAME: Category[] = ['Individual Stock', 'Dividend Stock', 'Crypto']
export const SCAM_RETURN_PCT = 10

export const BOSS_REWARD = { exp: 1000, gold: 250 }

/**
 * Cosmetic shop: gold buys titles, avatar frames and gear — never anything that touches real money.
 * Gear with `unlock` can't be bought: it's free once that money-side reward id has been earned.
 */
export interface ShopItem { id: string; kind: 'title' | 'frame' | 'gear'; price: number; cls?: string; slot?: GearSlot; sprite?: SpriteName; unlock?: string }
export const GEAR_SLOTS: GearSlot[] = ['head', 'body', 'legs', 'weapon', 'offhand']
export const SHOP: ShopItem[] = [
  { id: 'straw', kind: 'gear', slot: 'head', sprite: 'g_straw', price: 120 },
  { id: 'hood', kind: 'gear', slot: 'head', sprite: 'g_hood', price: 150 },
  { id: 'helm', kind: 'gear', slot: 'head', sprite: 'g_helm', price: 400 },
  { id: 'wizard', kind: 'gear', slot: 'head', sprite: 'g_wizard', price: 400 },
  { id: 'crown', kind: 'gear', slot: 'head', sprite: 'g_crown', price: 0, unlock: 'ach:goal' },
  { id: 'shirt', kind: 'gear', slot: 'body', sprite: 'g_shirt', price: 100 },
  { id: 'leather', kind: 'gear', slot: 'body', sprite: 'g_leather', price: 200 },
  { id: 'robe', kind: 'gear', slot: 'body', sprite: 'g_robe', price: 600 },
  { id: 'plate', kind: 'gear', slot: 'body', sprite: 'g_plate', price: 0, unlock: 'ach:clean' },
  { id: 'jeans', kind: 'gear', slot: 'legs', sprite: 'g_jeans', price: 150 },
  { id: 'trousers', kind: 'gear', slot: 'legs', sprite: 'g_trousers', price: 250 },
  { id: 'greaves', kind: 'gear', slot: 'legs', sprite: 'g_greaves', price: 500 },
  { id: 'sword', kind: 'gear', slot: 'weapon', sprite: 'g_sword', price: 300 },
  { id: 'staff', kind: 'gear', slot: 'weapon', sprite: 'g_staff', price: 300 },
  { id: 'bow', kind: 'gear', slot: 'weapon', sprite: 'g_bow', price: 300 },
  { id: 'flame', kind: 'gear', slot: 'weapon', sprite: 'g_flame', price: 0, unlock: 'ach:freedom' },
  { id: 'shield', kind: 'gear', slot: 'offhand', sprite: 'g_shield', price: 250 },
  { id: 'tome', kind: 'gear', slot: 'offhand', sprite: 'g_tome', price: 0, unlock: 'ach:streak7' },
  { id: 'lantern', kind: 'gear', slot: 'offhand', sprite: 'g_lantern', price: 0, unlock: 'ach:rest' },
  { id: 't_saver', kind: 'title', price: 100 },
  { id: 't_budget', kind: 'title', price: 300 },
  { id: 't_dragon', kind: 'title', price: 600 },
  { id: 't_compound', kind: 'title', price: 1000 },
  { id: 't_king', kind: 'title', price: 2500 },
  { id: 'f_silver', kind: 'frame', price: 200, cls: 'border-2 border-slate-400 bg-slate-400/20 text-slate-200' },
  { id: 'f_emerald', kind: 'frame', price: 500, cls: 'border-2 border-emerald-600 bg-emerald-500/20 text-emerald-700' },
  { id: 'f_ruby', kind: 'frame', price: 800, cls: 'border-2 border-red-600 bg-red-500/20 text-red-700' },
  { id: 'f_gold', kind: 'frame', price: 1500, cls: 'border-4 border-double border-amber-500 bg-amber-400/30 text-amber-700' },
  { id: 'f_arcane', kind: 'frame', price: 3000, cls: 'border-4 border-double border-violet-500 bg-violet-500/25 text-violet-700 shadow-[0_0_12px_#8b5cf6]' },
]
export const DEFAULT_FRAME = 'border border-amber-500/40 bg-amber-500/20 text-amber-800'
export const frameCls = (id?: string) => SHOP.find(x => x.id === id)?.cls ?? DEFAULT_FRAME
// Appearance (free to change): skin tone + hair color recolor the n/N and a/A sprite chars.
export const SKINS = [['#f2c9a0', '#d49a70'], ['#d9a066', '#b07742'], ['#9a6644', '#6e4228']] as const
export const HAIR_COLORS = [['#7a4424', '#4f2a14'], ['#2e2833', '#16121a'], ['#e0b04a', '#b8862b'], ['#b9b4c4', '#85809a']] as const
export const HAIRS = ['short', 'buzz', 'bun', 'long', 'spiky', 'none'] as const
export const BEARDS = ['none', 'stubble', 'mustache', 'full'] as const
export const SCENES = ['bg_castle', 'bg_forest', 'bg_mountain'] as const
export const DEFAULT_LOOK: Look = { gender: 'm', skin: 0, hair: 'short', hairColor: 0, beard: 'none' }
export const heroPalette = (look: Look = DEFAULT_LOOK) => {
  const sk = SKINS[look.skin] ?? SKINS[0], hc = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]
  return { n: sk[0], N: sk[1], a: hc[0], A: hc[1] }
}
/** Weapon / off-hand sprites move with the arms as one piece in poses. */
export const HELD_SPRITES = new Set(SHOP.filter(x => x.slot === 'weapon' || x.slot === 'offhand').map(x => x.sprite))

/** Sprite layers for the hero: body, hair, beard, then legs, top, headgear, weapon, off-hand. */
export function heroLayers(equip: GameState['equip'] = {}, look: Look = DEFAULT_LOOK): SpriteName[] {
  const order: GearSlot[] = ['legs', 'body', 'head', 'weapon', 'offhand']
  const opt = (prefix: string, id: string) => (id === 'none' ? [] : [`${prefix}_${id}` as SpriteName])
  return [look.gender === 'f' ? 'hero_f' : 'hero', ...opt('hair', look.hair), ...opt('beard', look.beard),
    ...order.map(sl => SHOP.find(x => x.id === equip[sl])?.sprite).filter((x): x is SpriteName => !!x)]
}

export const levelFromExp = (exp: number) => Math.floor(Math.sqrt(Math.max(0, exp) / 1000))
export const expForLevel = (lv: number) => lv * lv * 1000

export const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n))
export const localDate = (d = new Date()) => d.toLocaleDateString('sv-SE') // YYYY-MM-DD, local time
export const monthKey = (d = new Date()) => localDate(d).slice(0, 7)

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const week = Math.ceil(((+t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)
  return `${t.getUTCFullYear()}-W${week}`
}
export const periodKey = (p: Period, d = new Date()) =>
  p === 'daily' ? localDate(d) : p === 'weekly' ? isoWeek(d) : p === 'yearly' ? String(d.getFullYear())
    : `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function computeStats(s: GameState, now = new Date()) {
  const { profile: p, assets } = s
  const totalValue = sum(assets.map(a => a.currentValue))
  const totalInvested = sum(assets.map(a => a.invested))
  const gain = totalValue - totalInvested
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0

  const byRealm = Object.fromEntries(
    REALM_KEYS.map(r => [r, sum(assets.filter(a => a.realm === r).map(a => a.currentValue))]),
  ) as Record<Realm, number>

  // EXP: invested THB + quest/boss EXP
  const exp = Math.round(totalInvested + s.questExp)
  const level = levelFromExp(exp)

  // HP: emergency fund vs N months of expenses (N depends on how steady the job's income is)
  const job = jobOf(s)
  const hpMonths = job.months
  const hpMax = p.monthlyExpense * hpMonths
  const hp = clamp(p.emergencyFund, 0, hpMax)
  const monthsCovered = p.monthlyExpense > 0 ? p.emergencyFund / p.monthlyExpense : 0

  // MP: this month's DCA budget minus what has already been deployed
  const month = monthKey(now)
  const deposited = sum(s.txs.filter(t => t.kind === 'deposit' && t.date.startsWith(month)).map(t => t.amount))
  const mp = Math.max(0, p.monthlyBudget - deposited)

  // STR: savings rate, 50% savings rate = 100
  const str = p.monthlyIncome > 0 ? Math.round(clamp(((p.monthlyIncome - p.monthlyExpense) / p.monthlyIncome) * 200)) : 0
  // DEF: normalized diversification across realms (0-70) + insurance (30)
  const hhi = totalValue > 0 ? sum(REALM_KEYS.map(r => (byRealm[r] / totalValue) ** 2)) : 1
  const diversification = clamp(((1 - hhi) / (1 - 1 / REALM_KEYS.length)) * 100)
  const overweight = totalValue > 0
    ? assets.filter(a => SINGLE_NAME.includes(a.category) && (a.currentValue / totalValue) * 100 > CONCENTRATION_LIMIT).map(a => a.id)
    : []
  const def = clamp(Math.round(diversification * 0.7 + (p.insured ? job.insurance ?? 30 : 0) - (overweight.length ? 15 : 0)))
  // Thai vs foreign equity split against the level-based target
  const equity = byRealm.domestic + byRealm.international
  const foreignPct = equity > 0 ? (byRealm.international / equity) * 100 : 0
  // INT: knowledge quests completed
  const int = clamp(s.newsRead * 2)

  return {
    totalValue, totalInvested, gain, gainPct, byRealm,
    exp, level, levelFloor: expForLevel(level), levelCeil: expForLevel(level + 1),
    hp, hpMax, monthsCovered, mp, mpMax: p.monthlyBudget, deposited,
    str, def, int, diversification, overweight,
    foreignPct, targetForeign: targetForeignPct(level), equity,
    netWorth: totalValue + p.emergencyFund, hpMonths,
    // financial freedom: how much of monthly spending 4%/yr of net worth would cover
    freedomPct: p.monthlyExpense > 0 ? ((totalValue + p.emergencyFund) * SAFE_WITHDRAWAL / 12 / p.monthlyExpense) * 100 : 0,
    rank: rankFor(level, p.monthlyExpense > 0 && (totalValue + p.emergencyFund) * SAFE_WITHDRAWAL / 12 >= p.monthlyExpense),
  }
}
export type Stats = ReturnType<typeof computeStats>

/** Market crash sim: non-cash exposure takes the hit, DEF blocks up to half of it. */
export function volatilityHit(stats: Stats, crashPct: number) {
  const exposed = stats.totalValue - stats.byRealm.cash
  const raw = exposed * (crashPct / 100)
  const blocked = raw * (stats.def / 100) * 0.5
  return { raw, blocked, taken: raw - blocked }
}

/** Monthly-compounded projection, sampled yearly. */
export function project(start: number, monthly: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12
  let value = start
  let contributed = start
  const out = [{ year: 0, value: Math.round(value), contributed: Math.round(contributed), level: levelFromExp(value) }]
  for (let m = 1; m <= years * 12; m++) {
    value = value * (1 + r) + monthly
    contributed += monthly
    if (m % 12 === 0) out.push({ year: m / 12, value: Math.round(value), contributed: Math.round(contributed), level: levelFromExp(value) })
  }
  return out
}

export interface Quote { symbol: string; price: number; change?: number | null; ts: number; announced?: string }
/** Price-server key for a live-linked asset, e.g. SET:PTT, US:VOO, FUND:M0234_2537, CRYPTO:bitcoin, GOLD. */
export function quoteKey(a: Asset): string | null {
  if (!a.live) return null
  if (a.live === 'gold') return 'GOLD'
  const id = (a.quoteId || a.symbol).trim()
  return `${a.live.toUpperCase()}:${a.live === 'crypto' ? id.toLowerCase() : a.live === 'fund' ? id : id.toUpperCase()}`
}
/** Revalue live-linked assets as units × latest price. Returns the same array when nothing changed. */
export function applyQuotes(assets: Asset[], quotes: Record<string, Quote>): Asset[] {
  let changed = false
  const next = assets.map(a => {
    const k = quoteKey(a)
    const q = k ? quotes[k] : undefined
    if (!q || !a.units) return a
    const value = Math.round(a.units * q.price * 100) / 100
    if (value === a.currentValue) return a
    changed = true
    return { ...a, currentValue: value }
  })
  return changed ? next : assets
}

// ---------- asset watch: alerts tuned to what each asset is and why it's held ----------
/** Per category: daily move worth a ping (%), loss / gain vs cost that needs a look (%), days a hand-valued asset may go without an update. */
export const WATCH: Record<Category, { move: number; loss: number; gain: number; stale: number }> = {
  'Crypto': { move: 10, loss: 30, gain: 50, stale: 7 },
  'Individual Stock': { move: 5, loss: 20, gain: 30, stale: 14 },
  'Dividend Stock': { move: 5, loss: 20, gain: 30, stale: 30 },
  'Index ETF': { move: 3, loss: 10, gain: 25, stale: 30 },
  'REIT': { move: 4, loss: 15, gain: 25, stale: 30 },
  'Gold': { move: 2, loss: 10, gain: 15, stale: 14 },
  'Bond': { move: 2, loss: 3, gain: Infinity, stale: 60 },
  'Money Market': { move: 1, loss: 0.5, gain: Infinity, stale: 90 },
}
const VOLATILE: Category[] = ['Crypto', 'Individual Stock', 'Dividend Stock', 'REIT']
export type AlertKind = 'move' | 'loss' | 'gain' | 'short' | 'heavy' | 'stale'
export interface AssetAlert { id: string; asset: Asset; kind: AlertKind; level: 'info' | 'warn' | 'bad'; pct: number; days?: number }

/** Last day this asset's value was touched: bought, deposited into or edited. */
export function lastUpdate(s: GameState, a: Asset) {
  return s.txs.filter(t => t.sym === a.symbol && (t.kind === 'edit' || t.kind === 'buy' || t.kind === 'deposit'))
    .reduce((d, t) => (t.date > d ? t.date : d), a.purchaseDate || '')
}

/** Alerts for every recorded asset. Ids carry a severity band / date so a deeper drop or a new day pings again. */
export function assetAlerts(s: GameState, quotes: Record<string, Quote> = {}, now = new Date()): AssetAlert[] {
  const today = localDate(now)
  const total = sum(s.assets.map(a => a.currentValue))
  const out: AssetAlert[] = []
  for (const a of s.assets) {
    const w = WATCH[a.category]
    const pl = a.invested > 0 ? ((a.currentValue - a.invested) / a.invested) * 100 : 0
    const push = (kind: AlertKind, level: AssetAlert['level'], pct: number, band: string | number, days?: number) =>
      out.push({ id: `${a.id}:${kind}:${band}`, asset: a, kind, level, pct, days })
    // today's move, from the live feed (change is per unit, in price terms)
    const k = quoteKey(a), q = k ? quotes[k] : undefined
    if (q?.change != null && q.price - q.change > 0) {
      const move = (q.change / (q.price - q.change)) * 100
      if (Math.abs(move) >= w.move) push('move', move < 0 ? 'warn' : 'info', move, today)
    }
    if (pl <= -w.loss) push('loss', pl <= -2 * w.loss ? 'bad' : 'warn', pl, Math.floor(-pl / w.loss))
    else if (pl >= w.gain) push('gain', 'info', pl, Math.floor(pl / w.gain))
    // money needed soon sitting in something that swings
    if (a.horizon === 'short' && VOLATILE.includes(a.category)) push('short', pl < 0 ? 'bad' : 'warn', pl, pl < 0 ? 'red' : 'ok')
    const share = total > 0 ? (a.currentValue / total) * 100 : 0
    if (SINGLE_NAME.includes(a.category) && share > CONCENTRATION_LIMIT) push('heavy', 'warn', share, Math.floor(share / 5))
    // hand-valued assets drift out of date
    const last = lastUpdate(s, a)
    if (!a.live && last) {
      const days = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86400000)
      if (days > w.stale) push('stale', 'info', pl, last, days)
    }
  }
  const rank = { bad: 0, warn: 1, info: 2 }
  return out.sort((x, y) => rank[x.level] - rank[y.level] || Math.abs(y.pct) - Math.abs(x.pct))
}

const thbFmt = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })
export const thb = (n: number) => thbFmt.format(n)
export const signed = (n: number, f: (n: number) => string) => (n >= 0 ? '+' : '−') + f(Math.abs(n))
