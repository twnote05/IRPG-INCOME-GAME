// Run: npm run check
import assert from 'node:assert/strict'
import { QUESTS, applyQuotes, assetAlerts, lastUpdate, boost, byHorizon, computeStats, questReward, rankFor, quoteKey, isoWeek, levelFromExp, periodKey, project, volatilityHit } from './game.ts'
const eq2 = (a: unknown, b: unknown, m: string) => assert.deepEqual(a, b, m)
import type { GameState } from '../types.ts'
import { PALETTE, POSES, SPRITES, poseRows } from './sprites.ts'

assert.equal(levelFromExp(0), 0)
assert.equal(levelFromExp(999), 0)
assert.equal(levelFromExp(1000), 1)
assert.equal(levelFromExp(100_000), 10)

assert.equal(isoWeek(new Date(2026, 0, 1)), '2026-W1') // Thu
assert.equal(isoWeek(new Date(2027, 0, 1)), '2026-W53') // Fri belongs to prev ISO year

const p = project(0, 1000, 0, 2)
assert.equal(p.length, 3)
assert.equal(p[2].value, 24000)
assert.ok(project(0, 1000, 10, 10)[10].value > 120000)

const s: GameState = {
  profile: { name: 'x', monthlyIncome: 40000, monthlyExpense: 20000, emergencyFund: 60000, monthlyBudget: 5000, insured: true, highInterestDebt: false },
  assets: [
    { id: '1', name: 'a', symbol: 'A', realm: 'domestic', category: 'Index ETF', invested: 1000, currentValue: 1000, purchaseDate: '' },
    { id: '2', name: 'b', symbol: 'B', realm: 'international', category: 'Bond', invested: 1000, currentValue: 1000, purchaseDate: '' },
    { id: '3', name: 'c', symbol: 'C', realm: 'alternative', category: 'Gold', invested: 1000, currentValue: 1000, purchaseDate: '' },
    { id: '4', name: 'd', symbol: 'D', realm: 'cash', category: 'Money Market', invested: 1000, currentValue: 1000, purchaseDate: '' },
  ],
  txs: [{ id: 't', date: '2026-09-02', kind: 'deposit', label: '', amount: 2000 }],
  quests: {}, questExp: 500, gold: 0, newsRead: 10, bossDefeated: '', claimed: {}, owned: [], title: '', frame: '', equip: {}, look: { skin: 0, hair: 'short', hairColor: 0, beard: 'none' },
}
const st = computeStats(s, new Date(2026, 8, 28))
assert.equal(st.exp, 4000 + 500) // invested + quest EXP
assert.equal(st.def, 100) // perfectly diversified + insured
assert.equal(st.str, 100) // 50% savings rate
assert.equal(st.monthsCovered, 3)
assert.equal(st.mp, 3000)
assert.equal(st.int, 20)
assert.equal(volatilityHit(st, 20).taken, 3000 * 0.2 * 0.5)

assert.equal(st.foreignPct, 50)
assert.equal(st.targetForeign, 20) // level 2 -> beginner 80:20
assert.deepEqual(st.overweight, []) // no single-name stocks
const heavy = computeStats({ ...s, assets: [...s.assets, { id: '5', name: 'e', symbol: 'E', realm: 'domestic', category: 'Individual Stock', invested: 1000, currentValue: 1000, purchaseDate: '' }] })
assert.deepEqual(heavy.overweight, ['5']) // 20% of portfolio > 15% limit
assert.ok(heavy.def < st.def)
assert.equal(periodKey('quarterly', new Date(2026, 8, 28)), '2026-Q3')

const gold = { ...s.assets[2], live: 'gold' as const, units: 0.5 }
const ptt = { ...s.assets[0], symbol: 'ptt', live: 'set' as const, units: 100 }
const quotes = { GOLD: { symbol: 'GOLD', price: 65850, ts: 1 }, 'SET:PTT': { symbol: 'SET:PTT', price: 31.25, ts: 1 } }
assert.equal(quoteKey({ ...ptt, live: 'crypto', quoteId: 'Bitcoin ' }), 'CRYPTO:bitcoin')
assert.equal(quoteKey({ ...ptt, live: 'fund', quoteId: 'M0234_2537' }), 'FUND:M0234_2537')
const revalued = applyQuotes([gold, ptt, s.assets[3]], quotes)
assert.equal(revalued[0].currentValue, 32925)
assert.equal(revalued[1].currentValue, 3125)
assert.equal(revalued[2], s.assets[3]) // not live-linked: untouched
assert.equal(applyQuotes(revalued, quotes), revalued) // no change -> same array (no re-render loop)

const hz = byHorizon([{ ...s.assets[0], horizon: 'long' }, { ...s.assets[1], horizon: 'long' }, { ...s.assets[2], horizon: 'short' }, s.assets[3]])
assert.equal(hz.long.value, 2000)
assert.equal(hz.long.count, 2)
assert.equal(hz.short.count, 1)
assert.equal(hz.unset.count, 1)

// jobs: HP target and reward boosts
eq2(st.hpMonths, 6, 'no job saved = salaried, 6 months')
eq2(computeStats({ ...s, profile: { ...s.profile, job: 'freelance' } }).hpMax, 20000 * 9, 'freelance: 9 months')
eq2(computeStats({ ...s, profile: { ...s.profile, job: 'apprentice' } }).hpMax, 20000 * 3, 'apprentice: 3 months')
eq2(boost({ ...s, profile: { ...s.profile, job: 'freelance' } }, 'loot'), 2, 'freelance loot ×2')
eq2(boost(s, 'loot'), 1, 'salaried loot ×1')
const review = QUESTS.find(q => q.id === 'review')!
eq2(questReward({ ...s, profile: { ...s.profile, job: 'apprentice' } }, review), { exp: 450, gold: 90 }, 'apprentice knowledge ×1.5')
eq2(questReward({ ...s, profile: { ...s.profile, job: 'apprentice' } }, QUESTS.find(q => q.id === 'dca')!).exp, 500, 'non-knowledge quest unboosted')
eq2(computeStats({ ...s, assets: [], profile: { ...s.profile, job: 'guardian', insured: true } }).def, 40, 'guardian insurance DEF 40')
eq2([rankFor(0, false), rankFor(12, false), rankFor(55, false), rankFor(3, true)], ['intern', 'senior', 'director', 'free'], 'ranks')
eq2(st.rank, 'intern', 'tiny portfolio stays intern')
eq2(periodKey('yearly', new Date(2026, 11, 31)), '2026', 'yearly quest key')

// every sprite is a clean rectangle drawn only with palette colors
for (const [name, rows] of Object.entries(SPRITES))
  assert.ok(rows.every(r => r.length === rows[0].length && [...r].every(c => c === '.' || PALETTE[c])), `sprite ${name}`)

// poses: frames keep the grid size; sitting drops the head, blink closes the eyes
for (const [pose, { frames }] of Object.entries(POSES))
  for (const f of frames) for (const n of ['hero', 'g_sword', 'g_jeans'] as const) {
    const r = poseRows(SPRITES[n], f)
    assert.ok(r.length === 40 && r.every(x => x.length === 24), `${pose} ${n} size`)
  }
const topRow = (rows: string[]) => rows.findIndex(r => r.replace(/\./g, ''))
eq2(topRow(poseRows(SPRITES.hero, POSES.sit.frames[0], false, true)) - topRow(SPRITES.hero), 7, 'sitting: head 6+1 rows lower')
eq2(poseRows(SPRITES.hero, { blink: true }, false, true)[12][10], 'N', 'blink closes the eye')
eq2(poseRows(SPRITES.g_sword, { up: 6, sit: true }, true).join('').replace(/\./g, '').length, SPRITES.g_sword.join('').replace(/\./g, '').length - SPRITES.g_sword.join('').slice(34 * 24).replace(/\./g, '').length, 'held items move whole (only what falls off the bottom is lost)')

const walkL = poseRows(SPRITES.hero, { step: 'l' })
eq2([walkL[38].slice(0, 12) === SPRITES.hero[38].slice(0, 12), walkL[38].slice(12) === SPRITES.hero[38].slice(12)], [false, true], 'walk: only the left foot lifts')
eq2(poseRows(SPRITES.g_sword, { hx: 3 }, true)[20].indexOf('W'), SPRITES.g_sword[20].indexOf('W') + 3, 'attack: weapon swings sideways')

console.log('game.check: all good')

// asset watch
{
  const A = (id: string, category: GameState['assets'][number]['category'], invested: number, currentValue: number, extra = {}) =>
    ({ id, name: id, symbol: id, realm: 'domestic' as const, category, invested, currentValue, purchaseDate: '2026-09-20', ...extra })
  const w: GameState = { ...s, txs: [], assets: [
    A('etf', 'Index ETF', 1000, 880),                           // -12%: past the ETF line (10) but not the stock line (20)
    A('stk', 'Individual Stock', 1000, 880),                    // same -12%: no alert for a single stock yet
    A('btc', 'Crypto', 1000, 1000, { live: 'crypto', units: 1, horizon: 'short' }),
    A('mmf', 'Money Market', 1000, 990, { purchaseDate: '2026-01-01' }), // capital loss + not updated for months
    A('gld', 'Gold', 1000, 1200),                               // +20% >= gold's 15
  ] }
  const al = assetAlerts(w, { 'CRYPTO:btc': { symbol: 'CRYPTO:btc', price: 88, change: -12, ts: 0 } }, new Date(2026, 8, 28))
  const kinds = (id: string) => al.filter(x => x.asset.id === id).map(x => x.kind).sort()
  eq2(kinds('etf'), ['loss'], 'ETF dip alert at -12%')
  eq2(kinds('stk'), ['heavy'], 'stock -12% below its loss line; heavy because it is >15% of the portfolio')
  eq2(kinds('btc'), ['heavy', 'move', 'short'], 'crypto -12% today, short horizon, overweight')
  assert.ok(Math.abs(al.find(x => x.kind === 'move')!.pct + 12) < 1e-9, 'move % from per-unit change')
  eq2(kinds('mmf'), ['loss', 'stale'], 'money market below principal and stale')
  assert.equal(al.find(x => x.kind === 'stale')!.days, 270)
  eq2(kinds('gld'), ['gain'], 'gold rebalance nudge')
  assert.equal(al[0].level, 'bad', 'worst first')
  assert.notEqual(assetAlerts({ ...w, assets: [A('etf', 'Index ETF', 1000, 780)] })[0].id, al.find(x => x.asset.id === 'etf')!.id, 'deeper drop = new alert id')
  assert.equal(lastUpdate({ ...w, txs: [{ id: 'x', date: '2026-09-25', kind: 'edit', label: '', sym: 'mmf', amount: 1 }] }, w.assets[3]), '2026-09-25')
}
console.log('asset watch ok')
