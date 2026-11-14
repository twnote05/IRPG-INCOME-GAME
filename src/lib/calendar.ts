// Festive calendar: Thai holidays, shopping-sale days, payday and tax dates, shown on the month calendar.
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

function eventsOfYear(year: number, pay: Payday = 'last'): CalEvent[] {
  const out: CalEvent[] = FIXED.map(f => ({ id: f.id, date: `${year}-${f.md}`, kind: f.kind, icon: f.icon }))
  if (CNY[year]) out.push({ id: 'cny', date: `${year}-${CNY[year]}`, kind: 'holiday', icon: '🧧' })
  if (LOY_KRATHONG[year]) out.push({ id: 'loykrathong', date: `${year}-${LOY_KRATHONG[year]}`, kind: 'holiday', icon: '🪷' })
  for (let m = 1; m <= 12; m++) out.push({ id: 'payday', date: paydayOf(`${year}-${pad(m)}`, pay), kind: 'payday', icon: '💰' })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
export const eventsInMonth = (month: string, pay?: Payday) => eventsOfYear(+month.slice(0, 4), pay).filter(e => e.date.startsWith(month))
