import type { GameState } from '../types'
import type { Lang } from './i18n'
import { localDate } from './game'

const KEY = 'investor-rpg:v1'

export const uid = () => crypto.randomUUID()

export function seed(): GameState {
  const today = localDate()
  return {
    profile: {
      name: 'Nameless Hero',
      monthlyIncome: 45000, monthlyExpense: 22000, emergencyFund: 80000, monthlyBudget: 8000, insured: false, highInterestDebt: false,
    },
    assets: [
      { id: uid(), name: 'Vanguard S&P 500 ETF', symbol: 'VOO', realm: 'international', category: 'Index ETF', invested: 60000, currentValue: 68400, purchaseDate: '2025-03-10' },
      { id: uid(), name: 'SET50 Index Fund', symbol: 'SET50', realm: 'domestic', category: 'Index ETF', invested: 30000, currentValue: 28100, purchaseDate: '2025-06-01' },
      { id: uid(), name: 'Digital Infra REIT', symbol: 'DIF', realm: 'domestic', category: 'REIT', invested: 15000, currentValue: 15900, purchaseDate: '2025-09-15' },
      { id: uid(), name: 'Gold 96.5%', symbol: 'GOLD', realm: 'alternative', category: 'Gold', invested: 10000, currentValue: 12300, purchaseDate: '2025-11-20' },
      { id: uid(), name: 'Money Market Fund', symbol: 'MMF', realm: 'cash', category: 'Money Market', invested: 20000, currentValue: 20450, purchaseDate: '2026-01-05' },
    ],
    txs: [{ id: uid(), date: today, kind: 'start', label: '', sym: '', amount: 135000 }],
    quests: {}, questExp: 0, gold: 0, newsRead: 0, bossDefeated: '', claimed: {}, owned: [], title: '', frame: '', equip: {}, look: { skin: 0, hair: 'short', hairColor: 0, beard: 'none' },
  }
}

// ponytail: localStorage only. To go multi-device, swap these two functions for Supabase/Firebase calls.
export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seed(), ...JSON.parse(raw) }
  } catch { /* corrupted or blocked storage: fall back to seed */ }
  return seed()
}

/** A game save from the sheet or a backup file; null unless it really is one (never replace data with junk). */
export function parseState(raw: string): GameState | null {
  try {
    const d = JSON.parse(raw)
    return d && typeof d === 'object' && d.profile && Array.isArray(d.assets) && Array.isArray(d.txs) ? { ...seed(), ...d } : null
  } catch { return null }
}

export interface Prefs { lang: Lang; theme: 'light' | 'dark' }
const PREFS_KEY = 'investor-rpg:prefs' // read by the inline script in index.html too

export function loadPrefs(): Prefs {
  const fallback: Prefs = {
    lang: navigator.language.startsWith('th') ? 'th' : 'en',
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } } catch { return fallback }
}
export function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* storage blocked */ }
}

export function saveState(s: GameState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full or blocked */ }
}
