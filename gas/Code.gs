/**
 * Backend ของ Investor RPG — เก็บข้อมูลใน Google Sheet ของคุณเอง
 * รายรับ-รายจ่าย: แท็บ entries + plan (โปรโตคอลเดียวกับแอปรายรับรายจ่ายเดิม)
 * ฝั่งลงทุน/ตัวละคร: แท็บ game (JSON แบ่งเป็นชิ้น) — action gameLoad / gameSave
 * ตั้งค่า Script Property 1 ตัว: TOKEN  (Run ฟังก์ชัน setup ด้านล่าง)
 * Deploy: New deployment > Web app > Execute as: Me, Who has access: Anyone
 * วิธีตั้งค่าทีละขั้นอยู่ใน README.md หัวข้อ "ตั้งค่าเริ่มใช้งาน"
 */

// เว้นว่างได้ถ้าเปิด Apps Script จากในชีต (ส่วนขยาย → Apps Script) — ใช้ชีตนั้นเอง
// ถ้าเป็นโปรเจกต์แยก ให้ใส่ id จาก URL ของชีต (ช่วง /d/<id>/edit)
const SHEET_ID = '';

const prop = k => PropertiesService.getScriptProperties().getProperty(k);
const json = o => ContentService.createTextOutput(JSON.stringify(o))
                    .setMimeType(ContentService.MimeType.JSON);

const ENTRY_COLS = ['id', 'date', 'type', 'envelope', 'note', 'amount'];
const PLAN_COLS  = ['month', 'kind', 'name', 'amount', 'pct', 'n', 'of', 'acct', 'total'];

function doGet() {
  return json({ ok: true, note: 'ใช้ POST เท่านั้น — ถ้าเห็นข้อความนี้แปลว่า deploy สำเร็จแล้ว' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    // ผู้ที่รู้ URL เข้าถึงได้หมด (GAS ไม่มี auth ให้ตอน deploy แบบ Anyone) — token คือด่านเดียว
    if (req.token !== prop('TOKEN')) {
      // บอกว่าพลาดตรงไหนโดยไม่เปิดเผยตัว token เอง
      return json({ error: !prop('TOKEN') ? 'unauthorized: ฝั่ง GAS ยังไม่มี TOKEN — ไป Run ฟังก์ชัน setup ก่อน'
                         : !req.token     ? 'unauthorized: แอปไม่ได้ส่ง TOKEN มา — กรอกในช่องตั้งค่า'
                         : 'unauthorized: TOKEN ไม่ตรง — ค่าที่ถูกต้องอยู่ใน Execution log ของ setup (เป็น UUID มีขีด 4 ขีด)' });
    }
    const fn = ({ load, save, quick, gameLoad, gameSave })[req.action];
    if (!fn) return json({ error: 'unknown action: ' + req.action });
    return json(fn(req));
  } catch (err) {
    return json({ error: String(err && err.message || err) });
  }
}

// ---------- sheet helpers ----------
// openById ช้า (~200ms) และถูกเรียก 2 ครั้งต่อ request — เปิดครั้งเดียวพอ
let _ss;
const SS = () => _ss || (_ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet());

function sheet(name, cols) {
  const ss = SS();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(cols);
  return sh;
}
function rows(sh) {
  if (sh.getLastRow() < 2) return [];
  const [head, ...body] = sh.getDataRange().getValues();
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
function writeAll(sh, cols, records, textCols) {
  sh.clear();
  const grid = [cols, ...records.map(r => cols.map(c => r[c] ?? ''))];
  // ตั้งรูปแบบเป็นข้อความก่อนเขียน ไม่งั้น Sheets แปลง "2026-09" เป็นวันที่
  (textCols || []).forEach(c => {
    const i = cols.indexOf(c);
    if (i >= 0) sh.getRange(1, i + 1, grid.length, 1).setNumberFormat('@');
  });
  sh.getRange(1, 1, grid.length, cols.length).setValues(grid);
}
// Sheets แปลงข้อความอย่าง "2026-09" เป็นวันที่ให้เองโดยไม่ได้ขอ พออ่านกลับมาเลยเป็น Date
// ไม่ใช่สตริง ถ้าไม่ดักตรงนี้ คีย์เดือนจะเพี้ยนแล้วแผนทั้งเดือนหายไปจากหน้าจอ
// เช็คแบบ duck-typing ไม่ใช่ instanceof — ทนกว่าเวลาค่ามาจากคนละ realm
const isDate = v => !!v && typeof v.getMonth === 'function';
const asDate = v => isDate(v)
  ? Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd')
  : String(v).slice(0, 10);
const asMonth = v => isDate(v)
  ? Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM')
  : String(v).slice(0, 7);

// ---------- load / save ----------
function load() {
  const entries = rows(sheet('entries', ENTRY_COLS)).map(r => ({
    id: String(r.id), date: asDate(r.date), type: r.type, env: r.envelope,
    note: String(r.note), amount: Number(r.amount) || 0,
  }));

  const months = {};
  for (const r of rows(sheet('plan', PLAN_COLS))) {
    const mk = asMonth(r.month);
    if (!months[mk]) months[mk] = { income: [], plan: [], buckets: [] };
    const m = months[mk];
    if (r.kind === 'fuel') { m.fuel = JSON.parse(r.name); continue; }
    const key = { income: 'income', plan: 'plan', bucket: 'buckets' }[r.kind];
    if (!key) continue;
    m[key].push(key === 'buckets'
      ? { name: String(r.name), pct: Number(r.pct) || 0 }
      : { name: String(r.name), amount: Number(r.amount) || 0,
          ...(r.of ? { n: Number(r.n), of: Number(r.of) } : {}),
          ...(r.acct ? { acct: String(r.acct) } : {}),
          ...(r.total ? { total: Number(r.total) } : {}) });
  }
  return { months, entries, savedAt: prop('SAVED_AT') || '' };
}

/**
 * จดด่วนจากทางลัดบนหน้าโฮม (iOS Shortcuts) — ต่อท้ายแถวเดียว ไม่เขียนทับทั้งชีต
 * รับข้อความดิบแบบเดียวกับช่องพิมพ์ในแอป เช่น "กาแฟ 120"
 * ไม่เดาซองให้ ปล่อยเป็น "อื่นๆ" แล้วค่อยไปจัดในแอป (แอปจะจำไว้เองครั้งต่อไป)
 */
function quick(req) {
  const text = String(req.text || '').trim();
  const m = text.match(/([+-]?)\s*(\d[\d,]*(?:\.\d+)?)/);
  if (!m) throw new Error('ไม่เจอตัวเลขในข้อความ: ' + text);
  const amount = parseFloat(m[2].replace(/,/g, ''));
  if (!(amount > 0)) throw new Error('จำนวนเงินต้องมากกว่า 0');

  const note = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim() || 'ไม่ระบุ';
  const income = m[1] === '+';
  const date = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const row = { id: Utilities.getUuid(), date: date, type: income ? 'in' : 'out',
                envelope: income ? 'รายรับ' : 'อื่นๆ', note: note, amount: amount };

  const sh = sheet('entries', ENTRY_COLS);
  sh.appendRow(ENTRY_COLS.map(c => row[c]));
  return { ok: true, saved: (income ? '+' : '-') + amount + ' ' + note };
}

function save(req) {
  const doc = req.doc;
  // เก็บแถวที่ชีตมีแต่ในเครื่องไม่มีไว้ด้วย (เช่นที่เพิ่งจดด่วนมาจากมือถือ)
  // ไม่งั้นแอปที่มีของค้างจะเขียนทับแล้วรายการนั้นหายไปเลย
  const known = {};
  doc.entries.forEach(e => { known[String(e.id)] = true; });
  const extra = rows(sheet('entries', ENTRY_COLS))
    .filter(r => r.id && !known[String(r.id)])
    .map(r => ({ id: String(r.id), date: asDate(r.date), type: r.type,
                 envelope: r.envelope, note: String(r.note), amount: Number(r.amount) || 0 }));

  writeAll(sheet('entries', ENTRY_COLS), ENTRY_COLS, doc.entries.map(e => ({
    id: e.id, date: e.date, type: e.type, envelope: e.env,
    note: e.note, amount: e.amount,
  })).concat(extra), ['date']);

  const flat = [];
  for (const [month, m] of Object.entries(doc.months || {})) {
    m.income .forEach(r => flat.push({ month, kind: 'income', name: r.name, amount: r.amount }));
    m.plan   .forEach(r => flat.push({ month, kind: 'plan',   name: r.name, amount: r.amount, n: r.n ?? '', of: r.of ?? '', acct: r.acct ?? '', total: r.total ?? '' }));
    m.buckets.forEach(r => flat.push({ month, kind: 'bucket', name: r.name, pct: r.pct }));
    if (m.fuel) flat.push({ month, kind: 'fuel', name: JSON.stringify(m.fuel) });   // พารามิเตอร์เครื่องคิดค่าน้ำมัน
  }
  writeAll(sheet('plan', PLAN_COLS), PLAN_COLS, flat, ['month']);

  const at = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperty('SAVED_AT', at);
  return { ok: true, savedAt: at };
}

// ---------- ฝั่งลงทุน / ตัวละคร ----------
// ทั้งก้อนเป็น JSON เดียว แบ่งเป็นชิ้นละ 40,000 ตัวอักษร (เซลล์เก็บได้ไม่เกิน 50,000)
// ทุกชิ้นขึ้นต้นด้วย ~ กัน Sheets ตีความชิ้นที่บังเอิญขึ้นต้นด้วย = + - @ เป็นสูตร
const GAME_COLS = ['part', 'json'];
const GAME_CHUNK = 40000;

function gameLoad() {
  const parts = rows(sheet('game', GAME_COLS))
    .sort((a, b) => Number(a.part) - Number(b.part))
    .map(r => String(r.json).replace(/^~/, ''));
  return { state: parts.join(''), savedAt: prop('GAME_SAVED_AT') || '' };
}

function gameSave(req) {
  const s = String(req.state || '');
  const doc = JSON.parse(s); // ต้องเป็น JSON ที่ถูกต้อง ไม่งั้นไม่เขียนทับของเดิม
  if (!doc || !doc.profile || !Array.isArray(doc.assets)) throw new Error('ข้อมูลเกมไม่ครบ ไม่บันทึก');
  const chunks = [];
  for (let i = 0; i < s.length; i += GAME_CHUNK) chunks.push({ part: chunks.length, json: '~' + s.slice(i, i + GAME_CHUNK) });
  writeAll(sheet('game', GAME_COLS), GAME_COLS, chunks, ['json']);
  const at = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperty('GAME_SAVED_AT', at);
  return { ok: true, savedAt: at };
}

// ---------- เตือนรายวันทางอีเมล (ทางเลือกแทน Web Push — ไม่ต้องเปิดคอมทิ้งไว้) ----------
// ใส่ตัวเลขจริงลงใน "หัวข้อ" เมล จะได้อ่านจบตั้งแต่บนหน้าจอล็อก ไม่ต้องเปิดอ่าน
function dailyReminder() {
  const now = new Date(), tz = 'Asia/Bangkok';
  const month = Utilities.formatDate(now, tz, 'yyyy-MM');
  const day = Number(Utilities.formatDate(now, tz, 'd'));
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, lastDay - day + 1);

  const doc = load();
  const m = doc.months[month];
  const planned = m ? m.plan.reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0) : 0;
  const spent = doc.entries.reduce(function (a, e) {
    return a + (e.type === 'out' && String(e.date).slice(0, 7) === month ? Number(e.amount) || 0 : 0);
  }, 0);
  const left = planned - spent;
  const money = function (n) { return Math.round(n).toLocaleString('en-US'); };

  let subject, body;
  if (!planned) {
    subject = day <= 3 ? '💰 ต้นเดือนแล้ว — ยังไม่ได้ตั้งแผน' : '💰 อย่าลืมจดรายจ่ายวันนี้';
    body = day <= 3
      ? 'เปิดแอปแล้วกด "คัดลอกแผนจากเดือนก่อน" งวดผ่อนจะเดินเลขให้เอง'
      : 'เดือนนี้ยังไม่ได้ตั้งแผน เลยยังคำนวณยอดต่อวันให้ไม่ได้';
  } else if (left > 0) {
    subject = '💰 วันนี้ใช้ได้อีก ' + money(left / daysLeft) + ' บาท';
    body = 'เหลือ ' + money(left) + ' บาท อีก ' + daysLeft + ' วันจะสิ้นเดือน\n'
         + 'ใช้ไปแล้ว ' + money(spent) + ' จากแผน ' + money(planned);
  } else {
    subject = '⚠️ ใช้เกินแผนแล้ว ' + money(-left) + ' บาท';
    body = 'ใช้ไป ' + money(spent) + ' จากแผน ' + money(planned) + '\n'
         + 'เหลืออีก ' + daysLeft + ' วันจะสิ้นเดือน';
  }
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject,
    body + '\n\n' + (prop('APP_URL') || ''));
}

// ---------- แจ้งเตือนเข้า LINE ----------
// LINE Notify ปิดบริการไปแล้ว (31 มี.ค. 2568) ตัวนี้ใช้ Messaging API แทน
// ต้องตั้ง Script properties: LINE_TOKEN (Channel access token) และ LINE_TO (userId ของตัวเอง)

/** สรุปตัวเลขของวันที่กำหนด — แยกออกมาให้ทดสอบได้โดยไม่ต้องยิงเน็ต */
function dailyDigest(now) {
  const tz = 'Asia/Bangkok';
  const y = new Date(now.getTime() - 86400000);          // เมื่อวาน
  const yISO = Utilities.formatDate(y, tz, 'yyyy-MM-dd');
  const month = Utilities.formatDate(now, tz, 'yyyy-MM');
  const day = Number(Utilities.formatDate(now, tz, 'd'));
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, lastDay - day + 1);

  const doc = load();
  const m = doc.months[month];
  const planned = m ? m.plan.reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0) : 0;

  let spentMonth = 0, spentYesterday = 0;
  doc.entries.forEach(function (e) {
    if (e.type !== 'out') return;
    const d = String(e.date);
    if (d.slice(0, 7) === month) spentMonth += Number(e.amount) || 0;
    if (d === yISO) spentYesterday += Number(e.amount) || 0;
  });

  const left = planned - spentMonth;
  return { yesterday: yISO, spentYesterday: spentYesterday, planned: planned,
           spentMonth: spentMonth, left: left, daysLeft: daysLeft,
           perDay: left > 0 ? left / daysLeft : 0 };
}

/** ประกอบข้อความ — แยกจากการส่ง จะได้ทดสอบข้อความได้ตรงๆ */
function digestText(d) {
  const money = function (n) { return Math.round(n).toLocaleString('en-US'); };
  const dd = d.yesterday.slice(8, 10).replace(/^0/, '');
  const mon = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
               'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][Number(d.yesterday.slice(5, 7)) - 1];

  let t = 'สรุปเมื่อวาน ' + dd + ' ' + mon + '\n';
  t += d.spentYesterday > 0 ? 'ใช้ไป ' + money(d.spentYesterday) + ' บาท' : 'ไม่ได้จดรายการไว้';
  if (!d.planned) return t + '\n\nเดือนนี้ยังไม่ได้ตั้งแผน เลยยังบอกยอดต่อวันไม่ได้';
  t += '\n\n';
  t += d.left > 0
    ? 'วันนี้ใช้ได้ ' + money(d.perDay) + ' บาท\nเหลือ ' + money(d.left) + ' · อีก ' + d.daysLeft + ' วัน'
    : 'ใช้เกินแผนแล้ว ' + money(-d.left) + ' บาท\nเหลืออีก ' + d.daysLeft + ' วันจะสิ้นเดือน';
  return t;
}

/** ทำงานทุกวันตอนตี 5 */
function lineDaily() {
  const token = prop('LINE_TOKEN'), to = prop('LINE_TO');
  if (!token || !to) {
    Logger.log('ยังไม่ได้ตั้ง LINE_TOKEN หรือ LINE_TO ใน Script properties');
    return;
  }
  const text = digestText(dailyDigest(new Date()));
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: to, messages: [{ type: 'text', text: text }] }),
  });
  // 429 = โควตาเดือนนี้หมด, 401 = token ผิด/หมดอายุ — เขียนลง log ให้รู้ว่าทำไมไม่เด้ง
  if (res.getResponseCode() !== 200) Logger.log('LINE ส่งไม่สำเร็จ %s %s', res.getResponseCode(), res.getContentText());
}

/** รันครั้งเดียวเพื่อผูก trigger ตี 5 ทุกวัน */
function setupLineTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'lineDaily'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('lineDaily').timeBased().atHour(5).nearMinute(0).everyDays(1).create();
  Logger.log('ผูก trigger แล้ว — จะส่งทุกวันช่วงตี 5 (ตามเขตเวลาของโปรเจกต์)');
}

/** ส่งทดสอบทันทีโดยไม่ต้องรอตี 5 */
function lineTest() {
  Logger.log(digestText(dailyDigest(new Date())));
  lineDaily();
}

/** รันครั้งเดียวจากเมนู Run เพื่อผูก trigger 20:00 ทุกวัน */
function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyReminder')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyReminder').timeBased().atHour(20).everyDays(1).create();
}

/** รันครั้งเดียวเพื่อสร้าง TOKEN — แล้วเอาค่าที่ได้ไปใส่ในแอป */
function setup() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('TOKEN')) p.setProperty('TOKEN', Utilities.getUuid());
  Logger.log('====== คัดลอกบรรทัดล่างนี้ทั้งบรรทัดไปใส่ในช่องรหัสของแอป ======');
  Logger.log(p.getProperty('TOKEN'));
  Logger.log('================================================================');
  Logger.log('นี่ไม่ใช่รหัส deployment (AKfycb...) — คนละตัวกัน');
  Logger.log('ยังต้องตั้งเอง (ถ้าจะใช้เตือนทางเมล): APP_URL');
}

/** เผลอทำ TOKEN หาย หรืออยากเปลี่ยนใหม่ ให้รันอันนี้ */
function resetToken() {
  PropertiesService.getScriptProperties().setProperty('TOKEN', Utilities.getUuid());
  setup();
}
