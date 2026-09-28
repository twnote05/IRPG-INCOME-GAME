// Festive calendar: Thai holidays, shopping-sale days, payday and tax dates, plus which ones change the
// game (sale boss, trip quest, ang pao, scene decorations) and the time-of-day sky.
// Pure functions, no runtime imports — `npm run check` runs this under plain Node.

export type EventKind = 'holiday' | 'sale' | 'payday' | 'tax'
export type EventId =
  | 'newyear' | 'cny' | 'valentine' | 'songkran' | 'mother' | 'loykrathong' | 'father' | 'christmas' | 'nye'
  | 'sale9' | 'sale10' | 'sale11' | 'sale12' | 'payday' | 'taxfile' | 'taxbuy'
export interface CalEvent { id: EventId; date: string; kind: EventKind; icon: string }

const FIXED: { id: EventId; md: string; kind: EventKind; icon: string }[] = [
  { id: 'newyear', md: '01-01', kind: 'holiday', icon: '🎆' },
  { id: 'valentine', md: '02-14', kind: 'holiday', icon: '💝' },
  { id: 'taxfile', md: '03-31', kind: 'tax', icon: '🧾' },   // paper filing deadline for last year's income
  { id: 'songkran', md: '04-13', kind: 'holiday', icon: '💦' },
  { id: 'mother', md: '08-12', kind: 'holiday', icon: '🌸' },
  { id: 'sale9', md: '09-09', kind: 'sale', icon: '🛍' },
  { id: 'sale10', md: '10-10', kind: 'sale', icon: '🛍' },
  { id: 'sale11', md: '11-11', kind: 'sale', icon: '🛍' },
  { id: 'father', md: '12-05', kind: 'holiday', icon: '💛' },
  { id: 'sale12', md: '12-12', kind: 'sale', icon: '🛍' },
  { id: 'christmas', md: '12-25', kind: 'holiday', icon: '🎄' },
  { id: 'taxbuy', md: '12-31', kind: 'tax', icon: '🧾' },    // last day to buy SSF / RMF / insurance for this year
  { id: 'nye', md: '12-31', kind: 'holiday', icon: '🎇' },
]
// Lunar dates, precomputed so the app works offline. ponytail: extend the table after 2030.
export const CNY: Record<number, string> = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03' }
// Full moon of the 12th Thai lunar month — verify against the official calendar each year.
export const LOY_KRATHONG: Record<number, string> = { 2026: '11-24', 2027: '11-13', 2028: '11-02', 2029: '11-21', 2030: '11-10' }

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const shiftDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return iso(new Date(y, m - 1, d + n))
}
export const daysBetween = (a: string, b: string) => {
  const [ya, ma, da] = a.split('-').map(Number), [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 864e5)
}

/** Payday: a day of the month (clamped to month length) or 'last' = last weekday (Mon–Fri). */
export type Payday = number | 'last'
export function paydayOf(month: string, pay: Payday = 'last') {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  if (pay !== 'last') return `${month}-${pad(Math.min(Math.max(1, pay), last))}`
  const d = new Date(y, m - 1, last)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return iso(d)
}

export function eventsOfYear(year: number, pay: Payday = 'last'): CalEvent[] {
  const out: CalEvent[] = FIXED.map(f => ({ id: f.id, date: `${year}-${f.md}`, kind: f.kind, icon: f.icon }))
  if (CNY[year]) out.push({ id: 'cny', date: `${year}-${CNY[year]}`, kind: 'holiday', icon: '🧧' })
  if (LOY_KRATHONG[year]) out.push({ id: 'loykrathong', date: `${year}-${LOY_KRATHONG[year]}`, kind: 'holiday', icon: '🪷' })
  for (let m = 1; m <= 12; m++) out.push({ id: 'payday', date: paydayOf(`${year}-${pad(m)}`, pay), kind: 'payday', icon: '💰' })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
export const eventsInMonth = (month: string, pay?: Payday) => eventsOfYear(+month.slice(0, 4), pay).filter(e => e.date.startsWith(month))

/** Soonest events from today (today included), up to `days` ahead. */
export function upcoming(today: string, days = 45, pay?: Payday) {
  const y = +today.slice(0, 4)
  return [...eventsOfYear(y, pay), ...eventsOfYear(y + 1, pay)]
    .map(e => ({ ...e, inDays: daysBetween(today, e.date) }))
    .filter(e => e.inDays >= 0 && e.inDays <= days)
}

// ---------- scene decorations ----------
export type Season = 'songkran' | 'loykrathong' | 'christmas' | 'newyear' | 'cny'
/** Decoration shown in the hero's scene on/around a festival. */
export function seasonOn(date: string): Season | null {
  const y = +date.slice(0, 4), md = date.slice(5)
  const near = (center: string | undefined, before: number, after: number) => {
    if (!center) return false
    const d = daysBetween(`${y}-${center}`, date)
    return d >= -before && d <= after
  }
  if (md >= '04-12' && md <= '04-16') return 'songkran'
  if (near(LOY_KRATHONG[y], 1, 1)) return 'loykrathong'
  if (near(CNY[y], 1, 3)) return 'cny'
  if (md >= '12-30' || md <= '01-02') return 'newyear'
  if (md >= '12-20' && md <= '12-26') return 'christmas'
  return null
}

// ---------- sky by time of day ----------
export type SkyTime = 'dawn' | 'day' | 'dusk' | 'night'
export const skyAt = (hour: number): SkyTime => (hour >= 5 && hour < 7 ? 'dawn' : hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 19 ? 'dusk' : 'night')
/** Recolors for the scene chars: 1–4 sky bands, 0 near hills, 5 far mountains, 7 stars, 8/9 moon or sun. */
export const SKY: Record<SkyTime, Record<string, string>> = {
  night: { '1': '#0f1235', '2': '#1b2050', '3': '#2c3470', '4': '#3c4aa8', '0': '#2c3470', '5': '#6a74b8', '7': '#f7f0dc', '8': '#f7f0dc', '9': '#ffffff' },
  dawn: { '1': '#3b3f8f', '2': '#7a5aa8', '3': '#d97a9a', '4': '#f2a36b', '0': '#5a4a7a', '5': '#8a7ab0', '7': '#3b3f8f', '8': '#ffd27a', '9': '#fff1c4' },
  day: { '1': '#3f8fe0', '2': '#5aa8ee', '3': '#7cc0f5', '4': '#a9d8fa', '0': '#4b6a9a', '5': '#7f93c4', '7': '#3f8fe0', '8': '#ffd23f', '9': '#fff4a8' },
  dusk: { '1': '#2c2f7a', '2': '#6b3f8f', '3': '#c9546b', '4': '#f28b4a', '0': '#4a3a6a', '5': '#7a5a8a', '7': '#2c2f7a', '8': '#ff9d4a', '9': '#ffd08a' },
}
