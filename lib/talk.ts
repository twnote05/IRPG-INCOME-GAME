// What the hero chats about. Pure: context in, weighted topics out (lines live in i18n `talk`).
import type { Season } from './calendar.ts'

export type TalkKey =
  | 'over' | 'tired' | 'good' | 'cheer' | 'nolog' | 'rest' | 'streak'
  | 'morning' | 'lunch' | 'evening' | 'night' | 'weekend'
  | 'payday0' | 'payday' | 'sale' | Season
  | 'alert' | 'boss' | 'shop' | 'reserve' | 'idle'

export interface TalkCtx {
  hour: number
  weekday: number // 0 = Sunday
  day?: { hp: number; max: number; spent: boolean } // today's budget, when there's a plan
  logged: boolean // anything logged (or a no-spend day marked) today
  rest: boolean // today marked as a no-spend day
  streak: number
  cheer: boolean // weekly challenge done
  paydayIn?: number // days until payday (0 = today), when within a week
  sale?: string // name of a sale event within 3 days
  season: Season | null
  alert?: string // symbol of the worst warn/bad asset alert
  bossUp: boolean // payday boss still alive with DCA budget left
  canBuy: boolean // enough gold for something in the shop
  reserveLow: boolean // emergency fund under half its target
}
export interface Topic { key: TalkKey; w: number; arg?: string }

/** Topics worth talking about now. Urgent/specific ones weigh more than small talk. */
export function talkTopics(c: TalkCtx): Topic[] {
  const out: Topic[] = []
  const add = (key: TalkKey, w: number, arg?: string | number) => out.push({ key, w, arg: arg === undefined ? undefined : String(arg) })
  if (c.day && c.day.hp < 0) add('over', 8, Math.round(-c.day.hp).toLocaleString())
  else if (c.day && c.day.hp < c.day.max * 0.3) add('tired', 5, Math.round(c.day.hp).toLocaleString())
  else if (c.day && c.logged && c.day.spent) add('good', 3)
  if (c.cheer) add('cheer', 3)
  if (c.rest) add('rest', 3)
  if (!c.logged && c.hour >= 18) add('nolog', 5)
  if (c.streak >= 3) add('streak', 2, c.streak)
  if (c.paydayIn === 0) add('payday0', 6)
  else if (c.paydayIn !== undefined && c.paydayIn <= 3) add('payday', 3, c.paydayIn)
  if (c.sale) add('sale', 5, c.sale)
  if (c.season) add(c.season, 4)
  if (c.alert) add('alert', 4, c.alert)
  if (c.bossUp) add('boss', 2)
  if (c.canBuy) add('shop', 2)
  if (c.reserveLow) add('reserve', 2)
  add(c.hour >= 5 && c.hour < 11 ? 'morning' : c.hour >= 11 && c.hour < 14 ? 'lunch' : c.hour >= 17 && c.hour < 21 ? 'evening' : c.hour >= 21 || c.hour < 5 ? 'night' : 'idle', 1)
  if (c.weekday === 0 || c.weekday === 6) add('weekend', 1)
  add('idle', 1)
  return out
}

/** Weighted random line, never the same one twice in a row (when there's a choice). */
export function pickLine(topics: Topic[], lines: Record<TalkKey, string[]>, last?: string, rnd = Math.random): string {
  const pool = topics.flatMap(tp => (lines[tp.key] ?? []).map(l => ({ text: l.replace('{n}', tp.arg ?? ''), w: tp.w })))
  const fresh = pool.length > 1 ? pool.filter(p => p.text !== last) : pool
  let r = rnd() * fresh.reduce((t, p) => t + p.w, 0)
  for (const p of fresh) if ((r -= p.w) < 0) return p.text
  return fresh[fresh.length - 1]?.text ?? ''
}
