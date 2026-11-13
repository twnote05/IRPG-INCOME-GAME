// Run: npm run check — the self-tests from โปรเจค 2 (?selftest), ported, plus merge safety.
import assert from 'node:assert/strict'
import {
  alloc, budgetState, byAccount, carryMonth, dailyBudget, dateInMonth, daysInMonth, evalAmount, fuelCost, guessEnv,
  looksLikeToken, mergeBackup, mergeIntoRemote, nextMonth, nextPeriod, parseQuick, payoffMonth, periodN, pieData,
  prevMonth, sum, bucketTotals, goalProgress, validGasUrl, validMonth, vsPlan, yearMonths, dayLog, weekStart, addDays, type MoneyDb,
} from './logic.ts'

const eq = (a: unknown, b: unknown, m: string) => assert.deepEqual(a, b, m)
const ok = (c: unknown, m: string) => assert.ok(c, m)
const NAMES = ['ค่ากินรายเดือน', 'ค่าเดินทาง', 'ค่าไฟ', 'หนี้รถ']

// --- auto-categorization: hints match the user's own envelope names ---
eq(guessEnv('กาแฟ', NAMES), 'ค่ากินรายเดือน', 'coffee -> food envelope')
eq(guessEnv('เติมน้ำมัน', NAMES), 'ค่าเดินทาง', 'fuel -> travel')
eq(guessEnv('ค่าไฟ', NAMES), 'ค่าไฟ', 'name matches envelope')
eq(guessEnv('อะไรไม่รู้', NAMES), 'อื่นๆ', 'no match')
eq(guessEnv('น้ำเปล่า', NAMES), 'ค่ากินรายเดือน', 'water is food')
eq(guessEnv('เติมแก๊ส', NAMES), 'ค่าเดินทาง', 'gas is not food')
const L = { 'ตัดผม': 'ค่าเดินทาง' } // deliberately unnatural: what the user taught must win
eq(guessEnv('ตัดผม', NAMES, L), 'ค่าเดินทาง', 'learned first')
eq(guessEnv('ตัดผมหน้าปากซอย', NAMES, L), 'ค่าเดินทาง', 'containing a learned name')
eq(guessEnv('ตัดผม', NAMES, { 'ตัดผม': 'ซองที่ถูกลบไปแล้ว' }), 'อื่นๆ', 'deleted envelope not used')
eq(guessEnv('กาแฟ', NAMES, { 'กาแฟ': 'ค่าเดินทาง' }), 'ค่าเดินทาง', 'learned beats hints')

// --- parseQuick ---
eq(parseQuick('กาแฟ 120', NAMES)!.env, 'ค่ากินรายเดือน', 'auto envelope')
eq(parseQuick('+26000 เงินเดือน', NAMES), { amount: 26000, note: 'เงินเดือน', type: 'in', env: 'รายรับ' }, 'income')
eq(parseQuick('เงินเดือน 26000', NAMES)!.type, 'in', 'income by keyword')
eq(parseQuick('+โบนัสพิเศษ 5000', NAMES), { amount: 5000, note: 'โบนัสพิเศษ', type: 'in', env: 'รายรับ' }, 'leading + before the name')
eq(parseQuick('+ขายของ 300', NAMES)!.note, 'ขายของ', 'plus stripped from note')
eq(parseQuick('ค่าไฟ 1,250.50', NAMES)!.amount, 1250.5, 'comma + decimals')
ok(!parseQuick('') && !parseQuick('กาแฟ') && !parseQuick('0 ฟรี'), 'rejects invalid')

// --- evalAmount ---
eq(evalAmount('100*30'), 3000, 'multiply')
eq(evalAmount('(100*23)+200'), 2500, 'parentheses')
eq(evalAmount('9,822'), 9822, 'comma')
eq(evalAmount(''), 0, 'empty = 0')
ok(Number.isNaN(evalAmount('alert(1)')), 'no code injection')
ok(Number.isNaN(evalAmount('1/0')), 'Infinity rejected')

// --- real numbers from the August sheet ---
const BK = [{ pct: .27 }, { pct: .16 }, { pct: .43 }, { pct: .14 }].map((b, i) => ({ ...b, id: String(i), name: '' }))
const LEFT = 26000 - 24395.40
eq(Math.round(LEFT * 100) / 100, 1604.6, 'left matches sheet')
eq(alloc(LEFT, BK).map(b => Math.round(b.baht * 100) / 100), [433.24, 256.74, 689.98, 224.64], 'allocation matches sheet')
eq(alloc(-500, BK).map(b => b.baht), [0, 0, 0, 0], 'negative left = nothing allocated')
eq(Math.round(fuelCost({ km: 436, trips: 2, kmpl: 9.8, price: 16.59, discount: 0 }) * 100) / 100, 1476.17, 'gas cost matches sheet')
eq(fuelCost({ km: 10, trips: 1, kmpl: 10, price: 1, discount: 999 }), 0, 'discount never negative')

// --- installments / months ---
const row = (o: object) => ({ id: 'x', name: 'x', amount: 0, ...o })
eq(nextPeriod(row({ n: 2, of: 10 }))!.n, 3, 'period advances')
eq(nextPeriod(row({ n: 10, of: 10 })), null, 'finished drops off')
eq(payoffMonth({ n: 2, of: 10 }, '2026-08'), '2027-04', 'tyres paid off Apr')
eq(payoffMonth({ n: 3, of: 60 }, '2026-08'), '2031-05', '60 periods')
eq(payoffMonth({}, '2026-08'), null, 'no periods = never')
eq(payoffMonth({ of: 10 }, '2026-08'), '2027-06', 'only total periods filled')
eq(nextPeriod(row({ of: 10 }))!.n, 1, 'first period is 1')
eq(periodN({ n: '3' }), 3, 'string periods work')
eq(periodN({}), 0, 'missing = 0')
eq(periodN({ n: -5 }), 0, 'never negative')
eq(prevMonth('2026-01'), '2025-12', 'back across year')
eq(nextMonth('2026-12'), '2027-01', 'forward across year')
ok(validMonth('2026-10') && validMonth('2026-01') && validMonth('2026-12'), 'valid months')
ok(!validMonth('2026-13') && !validMonth('2026-00') && !validMonth('') && !validMonth(null) && !validMonth('2026-1'), 'invalid months')
eq(daysInMonth('2026-02'), 28, 'Feb')
eq(daysInMonth('2028-02'), 29, 'leap Feb')
eq(daysInMonth('2026-10'), 31, 'Oct')
eq(daysInMonth('2026-11'), 30, 'Nov')

// --- daily allowance ---
eq(dailyBudget(31000, 10000, '2026-08', '2026-08-01'), { daysLeft: 31, left: 21000, perDay: 21000 / 31 }, 'day 1')
eq(dailyBudget(31000, 10000, '2026-08', '2026-08-31'), { daysLeft: 1, left: 21000, perDay: 21000 }, 'last day')
eq(dailyBudget(30000, 30000, '2026-08', '2026-08-15').perDay, 0, 'fully spent')
eq(dailyBudget(20000, 25000, '2026-08', '2026-08-15').left, -5000, 'overspent is negative')
eq(dailyBudget(20000, 25000, '2026-08', '2026-08-15').perDay, 0, 'no negative per day')
eq(dailyBudget(3100, 0, '2026-09', '2026-08-15'), { daysLeft: 30, left: 3100, perDay: 3100 / 30 }, 'other month = whole month')
eq(yearMonths('2026').length, 12, '12 months')
eq(yearMonths('2026')[0], '2026-01', 'starts Jan')

// --- donut ---
const P = pieData([{ label: 'a', value: 50 }, { label: 'b', value: 30 }, { label: 'c', value: 20 }])
eq(P.slices.map(s => s.pct), [50, 30, 20], 'percentages sorted')
eq(pieData([]).slices.length, 0, 'empty')
eq(pieData([{ label: 'x', value: 5 }, { label: 'y', value: -3 }]).slices.length, 1, 'negatives dropped')
const many = pieData(Array.from({ length: 10 }, (_, i) => ({ label: 'c' + i, value: 10 - i })))
eq(many.slices.length, 7, '6 + other')
eq(many.slices[6].value, 4 + 3 + 2 + 1, 'other sums the rest')

// --- budget states: warn before the money runs out ---
eq(budgetState(799, 1000), 'ok', '79.9%')
eq(budgetState(800, 1000), 'warn', '80% warns')
eq(budgetState(1000, 1000), 'warn', 'exactly on budget is not over')
eq(budgetState(1001, 1000), 'over', 'over')
eq(budgetState(0, 0), 'ok', 'no budget no spend')
eq(budgetState(50, 0), 'over', 'spend without budget')
ok(dateInMonth('2026-10').startsWith('2026-10'), 'logs into viewed month')
ok(dateInMonth('2026-02', new Date(2026, 2, 31)) <= '2026-02-28', 'day 31 clamps to Feb')

// --- vsPlan / byAccount ---
const spent: Record<string, number> = { 'ค่ากิน': 3200, 'ค่าไฟ': 900 }
eq(vsPlan([row({ name: 'ค่ากิน', amount: 3000 }), row({ name: 'ค่าไฟ', amount: 1500 }), row({ name: '', amount: 9 })], n => spent[n] || 0),
  [{ name: 'ค่ากิน', planned: 3000, actual: 3200, diff: 200 }, { name: 'ค่าไฟ', planned: 1500, actual: 900, diff: -600 }], 'over first, skip unnamed')
eq(byAccount([row({ amount: 3000, acct: 'KNN' }), row({ amount: 4325, acct: 'KNN' }), row({ amount: 9822 })]), [['KNN', 7325], ['—', 9822]], 'group by account')

// --- URL / token ---
const EXEC = 'https://script.google.com/macros/s/AKfycby7hlczW7Oo/exec'
ok(validGasUrl(EXEC) && validGasUrl('  ' + EXEC + '  '), 'full URL')
ok(!validGasUrl('AKfycby7hlczW7Oo') && !validGasUrl(EXEC.replace('/exec', '/dev')) && !validGasUrl(EXEC.replace('https', 'http')) && !validGasUrl(''), 'bad URLs')
ok(!validGasUrl('https://script.google.com.evil.io/macros/s/x/exec'), 'look-alike host')
ok(looksLikeToken('a1b2c3d4-e5f6-7890-abcd-ef1234567890'), 'UUID token')
ok(!looksLikeToken('AKfycby7hlczW7Oo') && !looksLikeToken(''), 'deployment id is not a token')

// --- carry month ---
const carried = carryMonth({ income: [row({ name: 'เงินเดือน', amount: 30000 })], plan: [row({ name: 'ผ่อนรถ', amount: 9000, n: 11, of: 12 }), row({ name: 'ยาง', amount: 1000, n: 10, of: 10 })], buckets: [] })
eq(carried.plan.map(r => [r.name, r.n]), [['ผ่อนรถ', 12]], 'installment advances, finished one drops')

// --- merge safety: a new device must never wipe the sheet ---
const e = (id: string, date: string, type: 'in' | 'out', amount: number) => ({ id, date, type, env: 'x', note: 'n', amount })
const remote: MoneyDb = {
  months: { '2026-08': { income: [row({ amount: 40000 })], plan: [row({ amount: 20000 })], buckets: [] } },
  entries: [e('r1', '2026-08-10', 'out', 500)],
}
const local: MoneyDb = {
  months: { '2026-08': { income: [row({ amount: 0 })], plan: [], buckets: [] }, '2026-10': { income: [row({ amount: 45000 })], plan: [], buckets: [] } },
  entries: [e('l1', '2026-09-28', 'out', 120), e('r1', '2026-08-10', 'out', 999)],
}
const merged = mergeIntoRemote(remote, local)
eq(merged.db.months['2026-08'].plan[0].amount, 20000, "sheet's plan kept over local blank")
ok(merged.db.months['2026-10'], 'local-only month with a plan added')
eq(merged.db.entries.map(x => x.id), ['l1', 'r1'], 'local-only entry added, sheet copy wins on same id')
eq(merged.db.entries.find(x => x.id === 'r1')!.amount, 500, 'sheet value wins')
eq(merged.added, 2, 'counts what was added')
eq(mergeBackup(remote, [e('b1', '2026-07-01', 'out', 1)]).entries.length, 2, 'restore adds missing only')

// --- what the investing side reads (pct is a FRACTION, as stored in the sheet) ---
const doc: MoneyDb = {
  months: {
    '2026-08': { income: [row({ name: 'เงินเดือน', amount: 40000 })], plan: [], buckets: [] },
    '2026-09': {
      income: [row({ name: 'เงินเดือน', amount: 45000 })],
      plan: [row({ name: 'ค่าเช่า', amount: 8000 }), row({ name: 'ค่ากิน', amount: 7000 })],
      buckets: [{ id: '1', name: 'ลงทุน DCA', pct: 0.3 }, { id: '2', name: 'ฉุกเฉิน', pct: 0.2 }, { id: '3', name: 'เที่ยว', pct: 0.5 }],
    },
  },
  entries: [
    e('1', '2026-06-10', 'out', 9000), e('2', '2026-07-10', 'out', 12000), e('3', '2026-08-10', 'out', 15000), e('4', '2026-08-20', 'out', 3000),
    e('5', '2026-09-01', 'out', 5000), e('6', '2026-09-28', 'out', 120), e('7', '2026-05-01', 'out', 99999),
  ],
}
eq(sum([{ amount: 1 }, { amount: '2' as unknown as number }]), 3, 'sum tolerates strings')

// --- goals / day log ---
const tot = bucketTotals(doc)
eq(tot['ลงทุน DCA'], 9000, 'bucket saved = left × pct')
const g = goalProgress(tot, { 'ลงทุน DCA': 18000, 'เที่ยว': 10000, 'ไม่มี': 0 })
eq(g.map(x => [x.name, x.pct, x.reached]), [['ลงทุน DCA', 50, false], ['เที่ยว', 100, true]], 'unfinished first, zero targets dropped')

// day HP: 15000 plan in a 30-day month, 5000 spent on the 1st
const dl = dayLog(doc, '2026-09', 15000)
eq([dl[0].max, dl[0].hp, dl[0].active], [500, -4500, true], 'day 1: 15000/30 HP, took 5000')
eq(dl[1].max, 10000 / 29, 'day 2 HP = what is left ÷ days left')
eq(dl[1].active, false, 'nothing logged on day 2')

// weeks
eq(weekStart('2026-09-28'), '2026-09-28', 'Mon 28 Sep is its own week start')
eq(weekStart('2026-10-04'), '2026-09-28', 'Sunday belongs to the week before')
eq(addDays('2026-09-28', 5), '2026-10-03', 'addDays across month end')

console.log('money.check: all good')
