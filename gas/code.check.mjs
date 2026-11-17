// Run: npm run check — runs gas/Code.gs against a fake spreadsheet (no Google account needed)
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict'
const code = fs.readFileSync('gas/Code.gs', 'utf8')
const formatted = [] // [sheet name, column index] pairs that setNumberFormat('@') was called on
const sheets = {}, props = { TOKEN: 't' }
// Like real Sheets: a date-like string written to a cell NOT formatted as text ('@') comes back as a Date.
// sh.clear() resets formats too, as in Sheets.
const DATEISH = /^\d{4}-\d{2}(-\d{2})?$/
const mkSheet = name => { let g = [], text = new Set(); return {
  getLastRow: () => g.length, appendRow: r => g.push(r), clear: () => { g = []; text = new Set() },
  getDataRange: () => ({ getValues: () => g.map(r => [...r]) }),
  getRange: (r, c, nr, nc) => ({
    setNumberFormat(f) { if (f === '@') for (let i = 0; i < nc; i++) { text.add(c - 1 + i); formatted.push([name, c - 1 + i]) } return this },
    setValues: v => { g = v.map(x => x.map((y, i) => !text.has(i) && typeof y === 'string' && DATEISH.test(y) ? new Date(y) : y)) } }) } }
const ctx = { JSON, Object, String, Number, Array, Date, Math,
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v } }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n], insertSheet: n => (sheets[n] = mkSheet(n)) }), openById() { throw new Error('should use active sheet') } },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this } }), MimeType: { JSON: 'json' } },
  Utilities: { formatDate: (d, tz, f) => f === 'd' ? String(d.getUTCDate()) : d.toISOString().slice(0, f === 'yyyy-MM' ? 7 : 10), getUuid: () => 'u' + Object.keys(sheets).length + Math.random() } }
vm.createContext(ctx); vm.runInContext(code, ctx)
const call = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 't', ...body }) } }).s)

assert.match(call({ action: 'gameSave', state: '{}' }).error, /unknown action/, 'game sync is gone')
assert.match(call({ action: 'gameLoad' }).error, /unknown action/, 'game sync is gone')
assert.match(call({ action: 'nope' }).error, /unknown action/)
assert.match(JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 'bad', action: 'load' }) } }).s).error, /unauthorized/)

// a user's existing game tab (from the old version) must survive everything below
sheets.game = mkSheet('game'); sheets.game.appendRow(['part', 'json']); sheets.game.appendRow([0, '~sentinel'])
const doc = { entries: [{ id: 'e1', date: '2026-11-05', type: 'out', env: 'food', note: 'rice', amount: 50 }],
  months: { '2026-11': { income: [{ name: 'pay', amount: 100 }], plan: [{ name: 'rent', amount: 40 }], buckets: [{ name: 'a', pct: 10 }] } } }
assert.ok(call({ action: 'save', doc }).ok)
const back = call({ action: 'load' })
assert.deepEqual(Object.keys(back.months), ['2026-11'], 'month key stays the string 2026-11, not a Date')
assert.equal(back.months['2026-11'].plan[0].name, 'rent')
assert.equal(back.entries[0].date, '2026-11-05')
const col = (name, c) => sheets[name].getDataRange().getValues()[0].indexOf(c)
assert.ok(formatted.some(([n, i]) => n === 'plan' && i === col('plan', 'month')), "plan.month formatted '@'")
assert.ok(formatted.some(([n, i]) => n === 'entries' && i === col('entries', 'date')), "entries.date formatted '@'")

assert.ok(call({ action: 'quick', text: 'coffee 120' }).ok)
const after = call({ action: 'load' })
assert.equal(after.entries.length, 2); assert.equal(after.entries[1].note, 'coffee'); assert.equal(after.entries[1].amount, 120)
assert.equal(call({ action: 'save', doc: { ...doc, entries: doc.entries } }).ok, true)
assert.equal(call({ action: 'load' }).entries.length, 2, 'save keeps the quick entry the app did not know about')
assert.deepEqual(sheets.game.getDataRange().getValues(), [['part', 'json'], [0, '~sentinel']], 'existing game tab left untouched')
console.log('gas money sync ok: save/load/quick, month keys stay strings')

// --- the daily digest must use the app's own arithmetic: income − committed − discretionary ---
// Same fixture and same numbers as the TWICE block in src/money/logic.check.ts. If one side drifts
// (e.g. back to planned − spent), this fails: the 05:00 LINE push would contradict the home screen.
delete sheets.entries; delete sheets.plan           // start from an empty sheet, not the rows above
const dg = {
  months: { '2026-11': { income: [{ name: 'เงินเดือน', amount: 45000 }],
    plan: [{ name: 'ค่าไฟ', amount: 1000 }], buckets: [] } },
  entries: [
    { id: 't3', date: '2026-11-13', type: 'out', env: 'อาหาร', note: 'ข้าว', amount: 200 },
    { id: 't2', date: '2026-11-03', type: 'out', env: 'ค่าไฟ', note: 'ค่าไฟ', amount: 1000 }, // tapped จ่ายแล้ว
    { id: 't1', date: '2026-11-02', type: 'out', env: 'ค่าไฟ', note: 'ค่าไฟ', amount: 9000 }, // typed by hand
  ],
}
assert.ok(call({ action: 'save', doc: dg }).ok)
const dig = ctx.dailyDigest(new Date('2026-11-14T03:00:00Z'))
assert.equal(dig.income, 45000, 'income comes from the plan rows')
assert.equal(dig.committed, 1000, 'bills are committed for the whole month, paid or not')
assert.equal(dig.discretionary, 9200, 'only ONE ค่าไฟ entry is the paid marker; the second is real spending')
assert.equal(dig.left, 34800, 'left = 45000 − 1000 − 9200, exactly what spendable() returns')
assert.equal(dig.spentMonth, 10200, 'spent still counts every out entry')
assert.equal(dig.spentYesterday, 200, 'yesterday')
assert.equal(dig.daysLeft, 17, '14..30 November')
assert.match(ctx.digestText(dig), /วันนี้ใช้ได้ 2,047 บาท/, 'the LINE text carries that same figure')
// a 0-baht income row must not zero the income (blankMonth() always writes one)
delete sheets.entries; delete sheets.plan
assert.ok(call({ action: 'save', doc: { months: { '2026-11': { income: [{ name: 'เงินเดือน', amount: 0 }], plan: [], buckets: [] } },
  entries: [{ id: 'q1', date: '2026-11-02', type: 'in', env: 'รายรับ', note: 'เงินเดือน', amount: 45000 },
            { id: 'q2', date: '2026-11-09', type: 'out', env: 'อื่นๆ', note: 'กาแฟ', amount: 9208 }] } }).ok)
assert.equal(ctx.dailyDigest(new Date('2026-11-14T03:00:00Z')).left, 35792, 'a 0-baht income row falls back to logged income')
console.log('gas digest ok: same income − committed − discretionary as the app')
