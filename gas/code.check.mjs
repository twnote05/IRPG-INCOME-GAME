// Run: npm run check — runs gas/Code.gs against a fake spreadsheet (no Google account needed)
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict'
const code = fs.readFileSync('gas/Code.gs', 'utf8')
const sheets = {}, props = { TOKEN: 't' }
const mkSheet = () => { let g = []; return {
  getLastRow: () => g.length, appendRow: r => g.push(r), clear: () => { g = [] },
  getDataRange: () => ({ getValues: () => g.map(r => [...r]) }),
  getRange: (r, c, nr, nc) => ({ setNumberFormat() { return this }, setValues: v => { g = v.map(x => [...x]) } }) } }
const ctx = { JSON, Object, String, Number, Array, Date, Math,
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v } }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n], insertSheet: n => (sheets[n] = mkSheet()) }), openById() { throw new Error('should use active sheet') } },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this } }), MimeType: { JSON: 'json' } },
  Utilities: { formatDate: d => d.toISOString().slice(0, 10), getUuid: () => 'u' } }
vm.createContext(ctx); vm.runInContext(code, ctx)
const call = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 't', ...body }) } }).s)
assert.equal(call({ action: 'gameLoad' }).state, '', 'empty sheet')
const big = { profile: { name: '=x' }, assets: [], txs: Array.from({ length: 3000 }, (_, i) => ({ id: 'tx' + i, label: '+=-@ weird ' + i })) }
const s = JSON.stringify(big); assert.ok(s.length > 80000)
const r = call({ action: 'gameSave', state: s }); assert.ok(r.ok && r.savedAt)
assert.ok(sheets.game.getDataRange().getValues().length > 2, 'split into several rows')
const back = call({ action: 'gameLoad' }); assert.equal(back.state, s, 'round trip exact'); assert.equal(back.savedAt, r.savedAt)
assert.match(call({ action: 'gameSave', state: '{"x":1}' }).error, /ไม่ครบ/, 'rejects non-game JSON')
assert.equal(call({ action: 'gameLoad' }).state, s, 'bad save left the old copy intact')
assert.match(call({ action: 'gameSave', state: 'garbage' }).error, /JSON|Unexpected/)
assert.match(JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 'bad', action: 'gameLoad' }) } }).s).error, /unauthorized/)
console.log('gas game sync ok', s.length, 'chars in', sheets.game.getDataRange().getValues().length - 1, 'chunks')
