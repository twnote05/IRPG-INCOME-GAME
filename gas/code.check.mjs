// Run: npm run check — runs gas/Code.gs against a fake spreadsheet (no Google account needed)
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict'
const code = fs.readFileSync('gas/Code.gs', 'utf8')
const sheets = {}, props = { TOKEN: 't' }
// Like real Sheets: a date-like string written to a cell NOT formatted as text ('@') comes back as a Date.
// sh.clear() resets formats too, as in Sheets.
const DATEISH = /^\d{4}-\d{2}(-\d{2})?$/
const mkSheet = () => { let g = [], text = new Set(); return {
  getLastRow: () => g.length, appendRow: r => g.push(r), clear: () => { g = []; text = new Set() },
  getDataRange: () => ({ getValues: () => g.map(r => [...r]) }),
  getRange: (r, c, nr, nc) => ({
    setNumberFormat(f) { if (f === '@') for (let i = 0; i < nc; i++) text.add(c - 1 + i); return this },
    setValues: v => { g = v.map(x => x.map((y, i) => !text.has(i) && typeof y === 'string' && DATEISH.test(y) ? new Date(y) : y)) } }) } }
const ctx = { JSON, Object, String, Number, Array, Date, Math,
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v } }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n], insertSheet: n => (sheets[n] = mkSheet()) }), openById() { throw new Error('should use active sheet') } },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this } }), MimeType: { JSON: 'json' } },
  Utilities: { formatDate: (d, tz, f) => d.toISOString().slice(0, f === 'yyyy-MM' ? 7 : 10), getUuid: () => 'u' + Object.keys(sheets).length + Math.random() } }
vm.createContext(ctx); vm.runInContext(code, ctx)
const call = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 't', ...body }) } }).s)

assert.match(call({ action: 'gameSave', state: '{}' }).error, /unknown action/, 'game sync is gone')
assert.match(call({ action: 'gameLoad' }).error, /unknown action/, 'game sync is gone')
assert.match(call({ action: 'nope' }).error, /unknown action/)
assert.match(JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 'bad', action: 'load' }) } }).s).error, /unauthorized/)

const doc = { entries: [{ id: 'e1', date: '2026-11-05', type: 'out', env: 'food', note: 'rice', amount: 50 }],
  months: { '2026-11': { income: [{ name: 'pay', amount: 100 }], plan: [{ name: 'rent', amount: 40 }], buckets: [{ name: 'a', pct: 10 }] } } }
assert.ok(call({ action: 'save', doc }).ok)
const back = call({ action: 'load' })
assert.deepEqual(Object.keys(back.months), ['2026-11'], 'month key stays the string 2026-11, not a Date')
assert.equal(back.months['2026-11'].plan[0].name, 'rent')
assert.equal(back.entries[0].date, '2026-11-05')
assert.equal(sheets.game, undefined, 'no game tab is created')

assert.ok(call({ action: 'quick', text: 'coffee 120' }).ok)
const after = call({ action: 'load' })
assert.equal(after.entries.length, 2); assert.equal(after.entries[1].note, 'coffee'); assert.equal(after.entries[1].amount, 120)
assert.equal(call({ action: 'save', doc: { ...doc, entries: doc.entries } }).ok, true)
assert.equal(call({ action: 'load' }).entries.length, 2, 'save keeps the quick entry the app did not know about')
console.log('gas money sync ok: save/load/quick, month keys stay strings')
