# รายรับ-รายจ่าย (เดิม Investor RPG)
(ผมเป็นแค่คนทั่วไป ที่เบื่อหน่ายกับการจดรายรับรายจ่าย เลยใช้ Claude ช่วยสร้างภาพในหัวผมให้เป็นจริง และอยากแบ่งปันให้ทุกคนครับ)

เว็บแอปจดรายรับ-รายจ่ายส่วนตัว หน้าตาแบบ Retro OS มี 3 หน้า:

- **บันทึก (ใช้ทุกวัน):** จดด่วน `กาแฟ 120` · ปฏิทินของเดือน · รายการแยกตามวัน
- **แผน:** รายรับ รายจ่ายประจำ หนี้/ผ่อน ถังเงิน และเครื่องคิดค่าน้ำมัน
- **สรุป:** สรุปเดือนที่เลือกหน้าเดียว

ตั้งค่า (เชื่อม Google Sheet · สำรองข้อมูล · วันเงินเดือนออก) อยู่หลังปุ่ม ⚙ ไม่กินช่องแถบล่าง

รองรับภาษาไทย/อังกฤษ, โหมดมืด/สว่าง และมือถือ (ติดตั้งลงหน้าจอหลักแบบ PWA ได้)

> ⚠️ แอปนี้เป็นเครื่องมือช่วยสร้างวินัย ไม่ใช่คำแนะนำการลงทุน

## เริ่มต้นใช้งาน

> จะเอาขึ้นเว็บให้ใช้บนมือถือ ดู [ติดตั้งขึ้น GitHub Pages](#ติดตั้งขึ้น-github-pages-ทีละขั้น) และ [ตั้งค่าเริ่มใช้งาน](#ตั้งค่าเริ่มใช้งาน)

ต้องมี Node.js 22 ขึ้นไป

```bash
npm install
npm run dev            # เปิด http://localhost:5173
npm run dev -- --host  # เปิดให้มือถือใน Wi-Fi เดียวกันเข้าได้
npm run build          # ตรวจ type แล้ว build ลงโฟลเดอร์ dist/
npm run preview        # ลองเปิดไฟล์ที่ build แล้ว
npm run check          # ทดสอบปฏิทิน + ตรรกะรายรับรายจ่าย + Apps Script
```

## สามหน้าของแอป

| แท็บ | รายละเอียด |
|---|---|
| **บันทึก** | จดด่วน `กาแฟ 120` / `+เงินเดือน 45000` / `ค่าไฟ 100*3` (ใส่สูตรได้) · เดาซองเงินให้เองและจำซองที่เคยเลือก · เหลือใช้ได้วันละเท่าไร · ปฏิทินของเดือน · รายการแยกตามวัน แก้/ลบได้ |
| **แผน** | รายรับ · รายจ่ายประจำ · หนี้/ผ่อน (บอกเดือนที่ผ่อนหมด) · สรุปแยกตามบัญชี · ถังเงิน (%) พร้อมเป้า 🎯 ของแต่ละถัง · คำนวณค่าน้ำมัน · ยกแผนจากเดือนก่อน |
| **สรุป** | หน้าเดียวของเดือนที่เลือก: ยอดที่ใช้ไปเทียบแผน · โดนัทตามหมวด · จริงเทียบแผนรายซอง · หนี้และถังเงิน |
| **ตั้งค่า** (ปุ่ม ⚙ บนหัวเรื่อง ไม่กินช่องแถบล่าง) | เชื่อม Google Sheet · ส่งออก CSV · สำรอง/กู้คืน JSON · จัดการซองที่แอปจำไว้ |

### Sync กับ Google Sheet (`gas/Code.gs`)

Backend อยู่ใน repo ที่ `gas/Code.gs` (ต่อยอดจาก `Code.gs` ของโปรเจค 2 — ชีตเดิมใช้ต่อได้ **ไม่ต้องย้ายข้อมูล** แอปเดิมยังใช้คู่กันได้)

1. กดปุ่ม ⚙ **ตั้งค่า**
2. ใส่ URL `/exec` กับ TOKEN ของชีตคุณ (วิธีสร้างอยู่ที่ [ตั้งค่าเริ่มใช้งาน](#ตั้งค่าเริ่มใช้งาน))

การทำงาน:
- **เก็บในเครื่องก่อน (local-first):** ใช้งานได้แม้ออฟไลน์ แก้แล้วจะส่งขึ้นชีตหลังหยุดพิมพ์ 1.5 วินาที (action `save`)
- ดึงข้อมูลล่าสุดทุกครั้งที่เปิดแอปหรือสลับกลับมาที่แท็บ
- **เชื่อมครั้งแรก:** ข้อมูลในชีตเป็นหลัก รายการที่มีเฉพาะในเครื่องจะถูกเพิ่มเข้าไป ไม่มีอะไรถูกเขียนทับ
- **เครื่องที่ยังไม่เคยดึงข้อมูลจากชีต จะส่งข้อมูลขึ้นไม่ได้** เพื่อกันเครื่องใหม่ที่ว่างเปล่าล้างชีต
- TOKEN เก็บใน localStorage ของเครื่องนั้น และส่งไปที่ `script.google.com` เท่านั้น (แอปตรวจ URL ก่อนส่ง)
- ควรกด "สำรอง JSON" เก็บไว้ก่อนเชื่อมชีตครั้งแรก

## ติดตั้งขึ้น GitHub Pages (ทีละขั้น)

แอปเป็นเว็บล้วน (static) GitHub จะ build และโฮสต์ให้ฟรีผ่าน workflow `.github/workflows/deploy.yml`
ทุกครั้งที่ push ขึ้น `main` ระบบจะรัน `npm run check` → `npm run build` → deploy ให้เอง

### ☐ 1. เตรียมเครื่อง (ครั้งเดียว)

- ติดตั้ง [Git](https://git-scm.com/downloads) และ [Node.js 22+](https://nodejs.org/)
- มีบัญชี GitHub แล้วตั้งชื่อผู้ commit:

```bash
git config --global user.name "ชื่อของคุณ"
git config --global user.email "อีเมลที่ใช้กับ GitHub"
```

- ลอง `npm install` แล้ว `npm run check` และ `npm run build` ในเครื่องก่อน ถ้าผ่านที่นี่ บน GitHub ก็จะผ่าน

### ☐ 2. สร้าง repo บน GitHub

github.com → **New repository** → ตั้งชื่อ เช่น `investor-rpg`
- เลือก **Public** (บัญชีฟรีเปิด GitHub Pages ได้เฉพาะ repo public) — ปลอดภัย เพราะในโค้ดไม่มีความลับ
- **ไม่ต้อง** ติ๊กสร้าง README / .gitignore / license (มีในโปรเจคแล้ว)

### ☐ 3. push โค้ดขึ้นไป (ครั้งแรก)

เปิด terminal ที่โฟลเดอร์โปรเจคนี้:

```bash
git init -b main
git add .
git status
```

**ตรวจรายการใน `git status` ก่อน commit เสมอ** ต้องไม่มีไฟล์เหล่านี้ (ถูก `.gitignore` กันไว้แล้ว):
`*backup*.json`, `*.db`, `node_modules/`, `dist/`, โฟลเดอร์ `พรอมพ์รูปแบบ Pixel art/` และ `ความรู้การลงทุน/`

```bash
git commit -m "Investor RPG first release"
git remote add origin https://github.com/<username>/investor-rpg.git
git push -u origin main
```

> ครั้งแรกที่ push จะมีหน้าต่างให้ login GitHub ใน browser — login ตรงนั้น ไม่ต้องใส่รหัสผ่านใน terminal
> ไม่ถนัด command line ใช้ [GitHub Desktop](https://desktop.github.com/) แทนได้: File → Add local repository → เลือกโฟลเดอร์นี้ → Publish repository

### ☐ 4. เปิด GitHub Pages

repo → **Settings → Pages → Build and deployment → Source** เลือก **GitHub Actions**

แล้วไปที่แท็บ **Actions** จะเห็น "Deploy to GitHub Pages" กำลังรัน (ราว 1–2 นาที)
ถ้ารันก่อนเปิด Pages แล้วล้ม ให้กด **Re-run all jobs** อีกครั้ง

### ☐ 5. เปิดแอป

`https://<username>.github.io/investor-rpg/`

- ตั้ง `base: './'` ไว้แล้ว ใช้ชื่อ repo อะไรก็ได้
- เปิดบนมือถือแล้วติดตั้งเป็นแอป: **Android/Chrome** เมนู ⋮ → ติดตั้งแอป · **iOS/Safari** ปุ่ม Share → Add to Home Screen

### อัปเดตเวอร์ชันใหม่

```bash
git add .
git commit -m "อธิบายสิ่งที่แก้"
git push
```

รอ Actions เสร็จ แล้วเปิดแอปใหม่ (ถ้ายังเห็นของเก่า ให้ปิดแอปแล้วเปิดใหม่ หรือกดรีเฟรช)

## ตั้งค่าเริ่มใช้งาน

> **สำหรับคนที่เอาแอปไปใช้ต่อ:** เปิดลิงก์แอป → เพิ่มลงหน้าจอโทรศัพท์ → สร้างชีตของตัวเองตามข้อ 1 → ใส่ URL + TOKEN ของตัวเองตามข้อ 2
> **ห้ามใช้ชีตหรือ TOKEN ของคนอื่น** TOKEN คือกุญแจเขียนชีต ใครมีก็แก้ข้อมูลได้ ข้อมูลของแต่ละคนอยู่ในชีตของตัวเองเท่านั้น

### ☐ 0. ติดตั้งแอปลงโทรศัพท์

- **Android (Chrome):** เปิดลิงก์แอป → เมนู ⋮ → **ติดตั้งแอป**
- **iPhone (Safari):** เปิดลิงก์แอป → ปุ่มแชร์ → **เพิ่มไปยังหน้าจอโฮม**
- ⚠️ iPhone: แอปบนหน้าจอโฮมเก็บข้อมูล**คนละที่**กับ Safari — ติดตั้งก่อนแล้วค่อยเริ่มกรอก (หรือเชื่อมชีต ข้อมูลจะตามมาเอง)

### ☐ 1. เตรียม Google Sheet + Apps Script (ครั้งเดียว)

1. สร้าง **Google Sheet** ใหม่ (ชีตว่างได้เลย แท็บ `entries` `plan` `game` จะถูกสร้างให้เองตอนใช้ครั้งแรก)
2. ในชีต: **ส่วนขยาย → Apps Script** → ลบโค้ดเดิม → วางเนื้อหา [`gas/Code.gs`](gas/Code.gs) ทั้งไฟล์ → บันทึก
   - เปิดจากในชีตแบบนี้ **ไม่ต้องแก้อะไร** (`SHEET_ID` เว้นว่าง = ใช้ชีตที่เปิดอยู่)
   - ถ้าสร้างเป็นโปรเจกต์ Apps Script แยก ให้ใส่ id ของชีต (จาก URL ช่วง `/d/<id>/edit`) ที่ `SHEET_ID`
3. เลือกฟังก์ชัน **`setup`** → Run → อนุญาตสิทธิ์ → เปิด **Execution log** คัดลอก **TOKEN** (UUID มีขีด 4 ขีด) เก็บไว้ในที่ปลอดภัย
4. **การทำให้ใช้งานได้ → การทำให้ใช้งานได้ใหม่ → เว็บแอป** · ดำเนินการในฐานะ: **ฉัน** · ผู้มีสิทธิ์เข้าถึง: **ทุกคน**
5. คัดลอก URL ที่ลงท้าย `/exec` เปิดใน browser ต้องเห็น `{"ok":true,...}`

**มีชีตของแอปรายรับรายจ่ายเดิม (โปรเจค 2) อยู่แล้ว:** ใช้ชีตเดิมได้ วาง `gas/Code.gs` ทับโค้ดเดิม **แต่ใส่ `SHEET_ID` เดิมของคุณกลับเข้าไป** (ถ้าโปรเจกต์ Apps Script เป็นแบบแยก) → บันทึก → **การทำให้ใช้งานได้ → จัดการ → ✏️ แก้ไข → เวอร์ชันใหม่ → ทำให้ใช้งานได้** URL และ TOKEN เดิมใช้ต่อได้ทันที

> ⚠️ อย่า commit `Code.gs` ที่ใส่ `SHEET_ID` จริง หรือ TOKEN ลงใน repo — TOKEN กรอกในแอปเท่านั้น

### ☐ 2. เชื่อมแอปกับชีต

1. เปิดแอป → ปุ่ม ⚙ **ตั้งค่า**
2. ถ้ามีข้อมูลในเครื่องอยู่แล้ว กด **สำรอง** เก็บไฟล์ JSON ไว้ก่อน
3. ใส่ URL `/exec` และ TOKEN → แอปดึงข้อมูลจากชีตมารวม (ไม่มีอะไรถูกเขียนทับ)
4. ตั้ง **วันเงินเดือนออก** ในหน้าเดียวกัน (ค่าเริ่มต้น: วันทำงานสุดท้ายของเดือน)

ทำข้อ 3 กับ **ทุกเครื่อง** ที่ใช้ (มือถือ, คอม) — เครื่องที่ยังไม่เคยดึงจากชีตจะส่งข้อมูลขึ้นไม่ได้ กันเครื่องเปล่าล้างชีต

### ☐ 3. ใส่แผนเดือนแรก

1. หน้า **แผน** ใส่รายรับและงบรายจ่ายของเดือน → ได้ตัวเลข "เหลือใช้ได้วันละ"
2. เริ่มจดจากช่องบนสุดของหน้า **บันทึก** เช่น `กาแฟ 60`

### ⚠️ ย้ายจาก localhost ไป github.io

ข้อมูลใน browser แยกตามเว็บ สิ่งที่จดไว้ตอนรัน `localhost:5173` **จะไม่ตามไปที่ github.io เอง**
- ถ้าเชื่อมชีตแล้ว แค่เชื่อมชีตบน github.io ก็ได้ข้อมูลครบ ถ้ายังไม่เชื่อม → กด **สำรอง** บน localhost แล้ว **กู้คืน** บน github.io

### แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| เปิดลิงก์แล้ว 404 | ยังไม่ตั้ง Pages Source เป็น GitHub Actions หรือ Actions ยังไม่เสร็จ |
| Actions ล้มที่ `npm run check` | สูตรในโค้ดผิด — รัน `npm run check` ในเครื่องดูข้อความ แก้แล้ว push ใหม่ |
| Actions ล้มที่ `npm ci` | `package-lock.json` ไม่ได้ push ขึ้นไป หรือไม่ตรงกับ `package.json` → รัน `npm install` แล้ว commit ไฟล์ lock |
| ตั้งค่าชีตแล้วขึ้น `unauthorized` | TOKEN ไม่ตรง หรือยังไม่ได้ Run `setup` — ข้อความในแอปจะบอกว่ากรณีไหน |
| เปิด URL `/exec` แล้วเจอหน้า login | ตอน deploy Apps Script ยังไม่ได้เลือก "ทุกคน" |
| แก้ `Code.gs` แล้วไม่มีผล | ต้อง **จัดการการทำให้ใช้งานได้ → แก้ไข → เวอร์ชันใหม่** URL เดิมจึงจะใช้โค้ดใหม่ |
| ขึ้นสไตล์ไม่ครบ ตัวหนังสือกับปุ่มเปล่า ๆ | `vite.config.ts` บน GitHub ขาด `tailwindcss()` (เคยเกิดตอนแก้ไฟล์บนหน้าเว็บ) |

## โครงสร้างโค้ด

```
src/
├── App.tsx                  # หัวเรื่อง (ภาษา/ธีม), แถบเมนูล่าง 3 ปุ่ม
├── index.css                # ธีม Retro OS + โหมดมืด (CSS variables)
├── lib/
│   ├── i18n.ts              # ข้อความทั้งหมด ไทย/อังกฤษ
│   └── calendar.ts          # เทศกาล + วันเงินเดือนออก (+ calendar.check.ts)
├── money/
│   ├── logic.ts             # ตรรกะรายรับรายจ่ายทั้งหมด (+ logic.check.ts)
│   ├── useMoney.ts          # state, sync กับ Google Sheet, action
│   ├── fmt.ts · charts.tsx · AmountInput.tsx · CalendarView.tsx
│   └── MoneyApp · LogView · PlanView · SummaryView · MoneySettings
└── components/ui.tsx        # Panel / TitleBar / Field / ปุ่มพื้นฐาน
gas/
├── Code.gs                  # Apps Script backend ของชีต (วางในชีตของแต่ละคน)
└── code.check.mjs           # ทดสอบ Code.gs กับชีตจำลอง (อยู่ใน npm run check)
.github/workflows/deploy.yml # deploy ขึ้น GitHub Pages
assets/app-icon-source.webp  # ภาพต้นฉบับไอคอนแอป
```

**เพิ่ม/แก้ข้อความ:** แก้ใน `src/lib/i18n.ts` เท่านั้น ถ้าฝั่งภาษาไทยขาด key จะ build ไม่ผ่าน

**ธีม Pixel:** สีตาม design tokens ใน `พรอมพ์รูปแบบ Pixel art/` (โหมดมืด = กรมท่า `#0F1235`, โหมดสว่าง = กระดาษ parchment) สี `slate-*` ของ Tailwind ถูก remap ใน `index.css` และโหมดมืดประกาศตัวแปรชุดเดียวกันใหม่ใต้ `[data-theme="dark"]` · หัวข้อใช้ Pixelify Sans · **ตัวเลขใช้ DotGothic16** (โหลดเฉพาะตัวเลขและเครื่องหมาย ผ่าน `text=` ของ Google Fonts เพราะเลข 5/8 ของ Pixelify อ่านเหมือนตัว S) · ภาษาไทยใช้ Noto Sans Thai · ธีมถูกเซ็ตก่อน paint แรกด้วยสคริปต์เล็ก ๆ ใน `index.html` จึงไม่มีจอขาวแวบตอนเปิด

## การเก็บข้อมูล (localStorage)

| key | เก็บอะไร |
|---|---|
| `investor-rpg:prefs` | ภาษา / ธีม |
| `investor-rpg:money` | รายรับรายจ่าย (sync กับชีตได้) |
| `investor-rpg:money.*` | สถานะ sync, ซองที่จำไว้, เป้าหมายเก็บเงิน, วันไม่ใช้เงิน, วันเงินเดือนออก, เดือนที่เลือก, URL/TOKEN ของชีต |

- ชื่อ key ยังขึ้นต้นด้วย `investor-rpg:` เหมือนเดิม ข้อมูลเดิมจึงใช้ต่อได้ไม่ต้องย้าย
- ที่ยังอยู่เฉพาะในเครื่อง: ซองที่จำไว้ เป้าหมายเก็บเงิน วันไม่ใช้เงิน วันเงินเดือนออก ภาษา/ธีม
- ล้างข้อมูล browser แล้วข้อมูลที่ยังไม่ได้ sync จะหาย — ถ้าไม่ได้เชื่อมชีต ควรกดสำรองเป็นไฟล์ไว้

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · Lucide icons · Google Apps Script (ฐานข้อมูลชีต) · กราฟวาดเองเป็นพิกเซล (`src/money/charts.tsx`)

## สิ่งที่ยังไม่มี / ไอเดียต่อไป

- กล่องแก้ไขยอดเงินในแอปแทน `prompt()` ของเบราว์เซอร์
- นำเข้า CSV จากแอปธนาคาร
- แจ้งเตือนให้จดผ่าน LINE Messaging API
- service worker สำหรับใช้งานออฟไลน์

## บันทึกการเปลี่ยนแปลง

### 2026-11-12 — ย้ายฐานงานมาที่ repo นี้

เดิมทำงานกันที่โฟลเดอร์ `โปรเจค 2` (PWA ไฟล์เดียว) ย้ายมาทำที่นี่แทน
เพราะโปรเจค 2 ถูกรวมเข้ามาอยู่ใน `src/money/` เรียบร้อยแล้ว

- โฟลเดอร์นี้**ไม่มี `.git`** เลยไม่รู้ว่าไฟล์ไหนใหม่กว่า repo → ทำเป็น clone จริงโดยไม่แตะไฟล์
  (`git init` → `remote add` → `fetch` → `reset` แบบ mixed) แล้วค่อยดูว่าต่างตรงไหน
- ผลคือต่างจริงแค่ **2 ไฟล์** (`README.md`, `.github/workflows/deploy.yml`) ที่เหลือเป็นแค่
  ขึ้นบรรทัดใหม่ CRLF/LF — และทั้งสองไฟล์ในเครื่อง**เก่ากว่า** repo จึงดึงของ repo ทับ
- ตอนนี้โฟลเดอร์ = `origin/main` (`a380b69`) ไม่มีไฟล์ค้าง · `npm run check` ผ่านครบ 4 ชุด
  (game · calendar · money · gas)
- **จากนี้ push ได้จากโฟลเดอร์นี้ตรงๆ** ไม่ต้องอัปไฟล์ผ่านหน้าเว็บอีก

### 2026-11-12 — ทำฝั่งรายรับ-รายจ่ายให้ใช้ง่ายขึ้น

ยกวิธีเดียวกับที่ทำกับโปรเจค 2 มาใช้: ตัดสิ่งที่ไม่มีใครเปิดดู แล้วทำสิ่งที่ใช้ทุกวันให้กดง่าย

**ตัดออก**
- **ตัวสลับ รายวัน / รายเดือน / รายปี ในหน้าสรุป** — 3 โหมด × 5 การ์ด = 15 สถานะ
  เหลือหน้าเดียวของเดือนที่เลือก (ยอดที่ใช้ · โดนัท · เทียบแผน · หนี้ · ถังออม)
  โหมดรายวันซ้ำกับตัวเลข "เหลือใช้ได้วันละ" ที่อยู่บนหน้าบันทึกอยู่แล้ว
- **กราฟแนวโน้มแท่งตั้ง (`BarsV`)** — ยืนยันตั้งแต่รอบโปรเจค 2 แล้วว่าไม่ได้เปิดดู
  ลบทั้งคอมโพเนนต์ ไม่ใช่แค่ซ่อน
- คีย์ภาษา 12 ตัว (×2 ภาษา) และ `monShort` `yearLabel` ที่ตายตามไปด้วย

**ย้าย**
- **ตั้งค่า** ออกจากแถบล่าง ไปเป็นปุ่ม ⚙ ข้างตัวเลือกเดือน — แถบล่างเหลือ 4 ช่อง
  (บันทึก · ผจญภัย · แผน · สรุป) ปุ่มกว้างขึ้นจาก 62px เป็น 73px

**แก้**
- **ลบแล้วเอากลับคืนได้** แทนกล่องถาม `confirm()` ทุกครั้ง — แถบ "ลบแล้ว · เอากลับคืน"
  โผล่ 8 วินาที ใช้กับทั้งรายการที่จดและแถวในหน้าแผน
- **ขนาดปุ่มที่นิ้วกดได้** — ปุ่มลบรายการ 44px · ช่องเลือกซอง 47px · ยอดเงิน 44px
  (ขยายพื้นที่กด ไม่ใช่ขนาดที่ตาเห็น ด้วย padding + margin ติดลบ)
  ตรวจทั้งหน้าแล้วไม่เหลือปุ่มที่เล็กกว่า 24px ซึ่งเป็นขั้นต่ำของ WCAG 2.2 AA
- **แจ้งเตือนไม่เกิน 3 อันพร้อมกัน** — ตอนดึงข้อมูลเข้าครั้งแรกเคยเด้งขึ้นมา 7-8 อัน
  บังจอทั้งจอบนมือถือ

ตรวจแล้ว: `tsc` ไม่มี error · `npm run check` ผ่านครบ 4 ชุด · `npm run build` ผ่าน ·
เปิดจริงบนขนาดจอ 375px ทั้งไทยและอังกฤษ ไม่มี error ใน console และไม่ล้นขอบจอ

### 2026-11-12 — ตัดเกมและฝั่งลงทุนออก เหลือแอปรายรับ-รายจ่าย 3 หน้า

ชั้นเกม (EXP ทอง เควสต์ บอส ตัวละคร) และชั้นลงทุน (พอร์ต ราคาสด จำลองทบต้น) ถูกตัดออกทั้งหมด
เหลือเฉพาะสิ่งที่ใช้จริงทุกวัน: **บันทึก · แผน · สรุป**

**ลบ**
- `src/components/` ทั้งโฟลเดอร์ ยกเว้น `ui.tsx`
- `src/lib/`: `game.ts` `game.check.ts` `useGame.ts` `useGameSync.ts` `sprites.ts` `globe.ts` `talk.ts`
  `usePoseFlash.ts` `livePrices.ts` `storage.ts` `useNow.ts`
- `src/money/AdventureView.tsx` · โฟลเดอร์ `server/` · `tools/globe_gen.py` · `เปิดโปรแกรม.bat`
- `summarizeMoney` ใน `logic.ts` (ไม่มีใครเรียกแล้ว) และ `Season` `seasonOn` `SkyTime` `skyAt` `SKY` ใน `calendar.ts`
- คีย์ภาษาฝั่งเกม/ลงทุนทั้งหมดใน `i18n.ts` (จาก 1,280 บรรทัด เหลือ 289) เหลือแค่ `money` `cal` และคีย์ของหัวเรื่อง

**แก้**
- `App.tsx` เขียนใหม่: ไม่มีเมนูโลก ไม่มีแถบ EXP/ทอง ไม่มี toast — เหลือหัวเรื่อง (ภาษา/ธีม),
  `<MoneyApp>` และแถบล่าง 3 ปุ่ม · **state ภาษา/ธีมย้ายจาก `useGame`/`storage.ts` มาอยู่ใน `App.tsx`**
  โดยใช้ localStorage key เดิม `investor-rpg:prefs` สคริปต์กันจอขาวใน `index.html` จึงยังทำงานเหมือนเดิม
- `MoneyApp.tsx`: ตัดแท็บ `adv` ออก (`MONEY_TABS` = บันทึก · แผน · สรุป) ตั้งค่ายังอยู่หลังปุ่ม ⚙
- `LogView.tsx`: ตัดการ์ด HP, การ์ดสถิติต่อเนื่อง และปุ่มวันไม่ใช้เงิน — เหลือจดด่วน → เหลือใช้ได้วันละ → ปฏิทิน → รายการรายวัน
- `QuickAdd.tsx`: ตัดหีบสมบัติตอนจดรายรับ (และ `framer-motion` กับ `Sprite` ที่ใช้กับมัน)
- `package.json`: `npm run check` เหลือ calendar · money · gas

ตรวจแล้ว: `npx tsc -b` ไม่มี error · `npm run check` ผ่านทั้ง 3 ชุด · `npm run build` ผ่าน ·
เปิดจริงที่กว้าง 375px ทั้งไทย/อังกฤษ และมืด/สว่าง ลงที่หน้าบันทึก แถบล่างมี 3 ปุ่ม จด/ลบรายการได้ ไม่มี error ใน console

### Next steps

- `src/types.ts` ไม่มีใครเรียกแล้ว (เป็น type ของพอร์ต/เกมล้วน ๆ) รอ task ที่เก็บกวาด `logic.ts` ลบไปพร้อมกัน
- `logic.ts` ยังเหลือชั้นเกม (`dayLog` `validRest` `logStreak` `moneyRewards` `battleLog` `weekChallenge`)
  เพราะ `CalendarView.tsx` ยังใช้ `dayLog`/`validRest` อยู่ — task ถัดไปจะเปลี่ยนปฏิทินแล้วค่อยลบ
- `index.html` ยังใช้ชื่อ "Investor RPG" (title, meta, manifest) ถ้าจะเปลี่ยนชื่อแอปบอกได้
- การแก้ยอดเงินยังใช้ `prompt()` ของเบราว์เซอร์

## 2026-11-13 — ตัด game sync ออกจาก Apps Script

- `gas/Code.gs`: ลบ `gameLoad` `gameSave` `GAME_COLS` `GAME_CHUNK` property `GAME_SAVED_AT` รายการใน `doPost` และบรรทัดหัวไฟล์เรื่องแท็บ `game` — `doPost` เหลือ `load` `save` `quick`
- `gas/code.check.mjs`: เขียนใหม่ — เช็คว่า `gameSave`/`gameLoad` เป็น unknown action, `save`→`load` คีย์เดือน `'2026-11'` กลับมาเป็นสตริง (mock จำลอง Sheets แปลงสตริงคล้ายวันที่เป็น Date ถ้าเซลล์ไม่ใช่ข้อความ), `quick` ต่อท้ายรายการ, action แปลก/token ผิดได้ error
- แท็บ `game` ในชีตของผู้ใช้ปล่อยไว้ ไม่ลบ ไม่ล้าง ไม่มีโค้ดไหนแตะอีก

### Next steps
- ผู้ใช้ที่ deploy GAS ไว้แล้วต้อง deploy เวอร์ชันใหม่เองถ้าอยากให้ backend ตรงกัน (แอปเก่าที่ยังส่ง `gameSave` จะได้ error)

## 2026-11-13 — เลือกวันที่ตอนบันทึก และแก้วันที่ทีหลังได้

- `useMoney.ts`: เพิ่ม `entryDate` (state เท่านั้น ไม่เก็บลง localStorage — เปิดใหม่เริ่มที่วันนี้) `setEntryDate` `setDate(id, date)`; `addQuick(text)` ใช้ `entryDate` (ตัดพารามิเตอร์ `onToday`). กฎ: วันที่ชนะ — ถ้าอยู่คนละเดือนกับที่ header แสดง จะ `setCur` ตามไป (เรียกจาก event handler เท่านั้น ไม่มี effect จึงไม่วนลูป)
- `logic.ts` / `logic.check.ts`: ลบ `dateInMonth` กับ assertion
- `QuickAdd.tsx`: ช่อง `<input type="date">` ใต้ช่องพิมพ์ ค่าคงอยู่หลังกดเพิ่ม; ตัด prop `onToday`
- `LogView.tsx`: แต่ละแถวมีปุ่มวันที่ (ไอคอนปฏิทิน 44px); แถวเป็น 2 บรรทัดบนมือถือ (ชื่อเต็มบรรทัด) เพราะที่ 375px ชื่อถูกบีบเหลือ 20px
- `i18n.ts`: `money.entryDate`, `money.changeDate` ทั้ง en/th

### Next steps
- ตรวจปุ่มวันที่ในแถวบน Safari/Firefox (ซ่อนข้อความด้วย `::-webkit-datetime-edit` เฉพาะ Chromium)

## 2026-11-13 — Task 7: จ่ายแล้ว on plan rows
- `useMoney.ts`: `payRow` (logs out entry, note/env = row name, amount = row amount, on `entryDate`) and `unpayRow` (undoable delete of `paidEntryId`). Never touch `n`/`of`/`total`; paid state derived from entries.
- `PlanView.tsx`: 44px pay button on every named recurring/debt row, paid rows dimmed, header tally; blank-named rows show no button.
- `i18n.ts`: `markPaid`, `paidTick`, `paidTally` in both dictionaries.
- Next steps: Task 8 onward per plan.

## 2026-11-13 — Task 9: summary is one scrolling page
- `SummaryView.tsx` rewritten: today (`spendable`) -> this week (`weekDays`) -> month (donut + `envTotals` bars) -> whole year (`monthTotals`, tap a bar = switch header month). No mode switch. Today and week render only when selected month is the current month.
- `charts.tsx`: `BarsV` (7 and 12 bars; 12 uses 12.3k abbreviations; buttons when `onPick`).
- `logic.ts`: `envTotals` ties sort by label; `dailyBudget` deleted (LogView now uses `spendable`). `logic.check.ts` updated.
- `i18n.ts`: sumToday, setPlanHint, sumWeek, weekTotal, weekPeak, weekAvg, sumMonth, biggest, smallest, sumYear, nowMark (en + th).
- Next steps: Task 10 onward per plan; old debt/bucket summary panels were dropped (i18n keys debtTitle/bucketsAll etc. now unused).

## 2026-11-13 — Task 9 fix round 1
- `charts.tsx`: future-month bars dashed outline instead of opacity-60 (contrast). `i18n.ts`: weekAvg label says "so far" (en+th). `useMoney.ts`: month picker always offers next month.
- Next steps: Task 10 onward per plan.

## 2026-11-13 — Task 10: calendar without the game
- `CalendarView.tsx`: tiles are `over | under | none | future` from `dayTotals` vs `spendable().perDay`; each spent day shows its total (850 / 1.2k / 12k). Legend = 2 states. `index.css`: `--t-*` tile colours per theme (contrast >= 5.9:1). `i18n.ts`: legend `{under, over}` both langs.
- Removed `dayLog`, `validRest` (+ checks), `rest`/`setRest`/`restToday` from `useMoney` (export no longer carries `rest`; import ignores it). Key `investor-rpg:money.rest` kept, never read/written.
- Next steps: final review of the plan.
