export type Realm = 'domestic' | 'international' | 'alternative' | 'cash'
export type Category =
  | 'Index ETF' | 'Individual Stock' | 'Bond' | 'REIT'
  | 'Dividend Stock' | 'Crypto' | 'Gold' | 'Money Market'
export type Period = 'daily' | 'weekly' | 'quarterly' | 'yearly'
/** Real-life job type: how income arrives. Separate from HeroClass (investing style). */
export type Job = 'salaried' | 'freelance' | 'merchant' | 'guardian' | 'apprentice'

export interface Asset {
  id: string
  name: string
  symbol: string
  realm: Realm
  category: Category
  invested: number
  currentValue: number
  purchaseDate: string // YYYY-MM-DD
  live?: LiveSource // revalue as units × live price from the price server
  quoteId?: string // provider id when it differs from `symbol` (fund proj_id, CoinGecko coin id)
  units?: number // shares / fund units / coins held, or baht-weight of gold
  horizon?: Horizon // how long this money is meant to stay invested
  platform?: string // app / broker it was bought through (Dime, InnovestX, Streaming…)
}
export type GearSlot = 'head' | 'body' | 'legs' | 'weapon' | 'offhand'
/** Hero appearance: indexes into SKINS / HAIR_COLORS, ids from HAIRS / BEARDS. */
export interface Look { gender?: 'm' | 'f'; skin: number; hair: string; hairColor: number; beard: string; scene?: number }
export type Horizon = 'short' | 'medium' | 'long'
export type LiveSource = 'set' | 'us' | 'fund' | 'crypto' | 'gold'

export interface Tx {
  id: string
  date: string // YYYY-MM-DD
  kind: 'start' | 'buy' | 'deposit' | 'edit' | 'remove'
  label: string // legacy free text; new entries render from `sym` in the current language
  sym?: string
  amount: number
}

export interface Profile {
  name: string
  job?: Job // missing on old saves = salaried
  monthlyIncome: number
  monthlyExpense: number
  emergencyFund: number
  monthlyBudget: number // MP: monthly DCA budget
  insured: boolean
  highInterestDebt: boolean
}

export interface GameState {
  profile: Profile
  assets: Asset[]
  txs: Tx[]
  quests: Record<string, string> // questId -> period key it was last completed in
  questExp: number
  gold: number
  newsRead: number
  bossDefeated: string // YYYY-MM of last defeated payday boss
  claimed: Record<string, 1> // money-side reward ids already paid out (see moneyRewards)
  owned: string[] // shop item ids bought with gold
  title: string // equipped title id ('' = none)
  frame: string // equipped avatar frame id ('' = default)
  equip: Partial<Record<GearSlot, string>> // worn gear item id per slot
  look: Look
}
