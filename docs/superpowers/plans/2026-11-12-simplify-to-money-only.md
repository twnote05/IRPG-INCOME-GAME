# Simplify to a money-only app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the RPG and investing layers out of Investor RPG, leaving a three-page income/expense app that is faster to use, with a date field on every entry, a one-tap "paid" button on plan rows, and a single scrolling summary page.

**Architecture:** Delete first, then add, then restyle. All new numbers are pure functions in `src/money/logic.ts` covered by the existing assert-based `logic.check.ts`; the React views stay thin. "Paid" is derived from logged entries, never stored, so deleting an entry un-pays its row automatically.

**Tech Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Google Apps Script (`gas/Code.gs`) · tests are plain `node:assert` files run by `npm run check`

**Spec:** `docs/superpowers/specs/2026-11-12-simplify-to-money-only-design.md`

## Global Constraints

- No new dependencies.
- localStorage keys keep the `investor-rpg:` prefix. Do not rename or delete any key, including the orphaned `investor-rpg:money.rest` and the game's own keys.
- The Google Sheet contract is frozen: actions `load` `save` `quick`, tabs `entries` and `plan`, months written as text `yyyy-MM`. Never delete a user's existing `game` tab.
- Thai and English both work; dark and light both work; no white flash on load.
- Contrast ≥ 4.5:1 for text in both themes. Color never carries meaning alone — every state also has words.
- Pointer targets ≥ 24px everywhere, ≥ 44px for anything used daily.
- Primary test width is 375px.
- After every task: `npx tsc -b` clean, `npm run check` passes, `npm run build` passes, no console errors.
- Tests go in the existing `src/money/logic.check.ts` using its idiom: top-level `eq(actual, expected, 'message')` / `ok(cond, 'message')`, no test framework.

## Review Focus

Five things the spec implies but that no task's main flow exercises. Each line's test is attached to the task that owns the code.

1. **A month with no plan and no income rows at all** (true for several of the 13 imported months) — `spendable` must report "no plan yet" rather than dividing a negative by days. → Task 4.
2. **The last day of the month** — days-left must be 1, never 0, or the per-day number is Infinity. → Task 4.
3. **Plan rows with a blank name, or two rows with the same name** — `paidNames` must not match a blank note and must not crash. → Task 5.
4. **A future month selected** (the picker always offers next month) — the summary's "today" and "this week" blocks must disappear instead of showing negative days left. → Task 9.
5. **Back-dating into a month that has no entries yet** — the view follows the date into an empty month, and the new entry must be the one row shown there. → Task 6.

---

### Task 1: Strip the game layer out of `src/money/logic.ts`

**Files:**
- Modify: `src/money/logic.ts`
- Test: `src/money/logic.check.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a `logic.ts` whose only remaining exports are the money ones. Keep `weekStart(dateISO: string): string` (Monday of that week) and `addDays(dateISO: string, n: number): string` — they are plain date helpers that Task 8 needs.

- [ ] **Step 1: Delete the game exports from `logic.ts`**

Remove: `logStreak` `bestStreak` `dayLog` `validRest` `monsters` `dayRange` `battleLog` `CHALLENGES` `Challenge` `CHALLENGE_GOAL` `weekChallenge` `RewardKind` `Reward` `REWARD` `CHEST_STEPS` `ACHIEVEMENTS` `Achievement` `TRIP_GOAL` `moneyRewards`, and the `// ---------- game layer ----------` banner. Also remove the `Payday` import if nothing left uses it.

Keep `summarizeMoney` for now — Task 2 decides its fate.

- [ ] **Step 2: Delete the matching assertions from `logic.check.ts`**

Remove every `eq`/`ok` line that calls a deleted function, and drop those names from the import list.

- [ ] **Step 3: Run the checks**

Run: `npm run check`
Expected: `money.check: all good` (the other three lines still print — Task 2 removes `game.check`).

- [ ] **Step 4: Commit**

```bash
git add src/money/logic.ts src/money/logic.check.ts
git commit -m "refactor: drop the game functions from money logic"
```

---

### Task 2: Reduce the app shell to three money tabs

**Files:**
- Delete: every file in `src/components/` except `ui.tsx`; `src/lib/game.ts` `useGame.ts` `useGameSync.ts` `game.check.ts` `sprites.ts` `globe.ts` `talk.ts` `usePoseFlash.ts` `livePrices.ts` `storage.ts` `useNow.ts`; `src/money/AdventureView.tsx`; `server/`; `tools/globe_gen.py`; `เปิดโปรแกรม.bat`
- Modify: `src/App.tsx` `src/money/MoneyApp.tsx` `src/money/LogView.tsx` `src/money/QuickAdd.tsx` `src/money/useMoney.ts` `src/lib/i18n.ts` `src/lib/calendar.ts` `package.json` `README.md`

**Interfaces:**
- Consumes: Task 1's trimmed `logic.ts`.
- Produces: `MoneyTab = 'log' | 'plan' | 'sum' | 'set'` and `MONEY_TABS: MoneyTab[] = ['log', 'plan', 'sum']` from `MoneyApp.tsx`. `App.tsx` renders `<MoneyApp>` directly — no `Mode`, no `World`, no `useGame`.

- [ ] **Step 1: Delete the files listed above**

`src/components/ui.tsx` stays. After this, `src/lib/` holds only `calendar.ts` `calendar.check.ts` `i18n.ts`.

- [ ] **Step 2: Rewrite `src/App.tsx`**

It becomes: read theme and language (move that state out of the deleted `useGame`/`storage.ts` into `App.tsx` itself, same localStorage keys), render a header with the app title plus the language and theme buttons, render `<MoneyApp>`, and render the three-button bottom taskbar. No EXP bar, no gold, no breadcrumb, no toasts, no level-up overlay, no `TransactionModal`. Keep the `ResizeObserver` that sets `--hdr`, which the sticky quick-add depends on.

- [ ] **Step 3: Remove the `adv` tab and its leftovers**

`MoneyApp.tsx`: drop `'adv'` from `MONEY_TABS` and the `AdventureView` import and branch. `LogView.tsx`: delete the HP card, the streak card, and the rest button, so the view is quick-add → spendable number → calendar → entries by day. `QuickAdd.tsx`: delete the treasure-chest popup and the `framer-motion` and `Sprite` imports, leaving the form and its hint. `useMoney.ts`: delete `rest` `setRest` `restToday` `payday` `setPayday` `goals`-free game fields and the `summary` members that came from the deleted functions; keep `goals` `goalList` `saved` because the plan page uses them.

- [ ] **Step 4: Decide `summarizeMoney`'s fate**

If nothing imports it after step 3, delete it from `logic.ts` and its assertions from `logic.check.ts`.

- [ ] **Step 5: Strip the game keys from `src/lib/i18n.ts`**

Delete the game sections from both the English and Thai dictionaries, including any `t.adv.*` key the money views were borrowing — give those their own key under `money` instead. Nothing outside `money`, `cal`, and the shell may remain.

- [ ] **Step 6: Trim `src/lib/calendar.ts`**

Keep `EventKind` `EventId` `CalEvent` `CNY` `LOY_KRATHONG` `shiftDays` `daysBetween` `Payday` `paydayOf` `eventsOfYear` `eventsInMonth` `upcoming`. Delete `Season` `seasonOn` `SkyTime` `skyAt` `SKY` and their assertions in `calendar.check.ts`.

- [ ] **Step 7: Drop `game.check.ts` from the check script**

`package.json`: `"check"` becomes the calendar, money, and gas checks only.

- [ ] **Step 8: Verify**

Run: `npx tsc -b && npm run check && npm run build`
Expected: no TypeScript errors, three check lines pass, build succeeds.

- [ ] **Step 9: Open the app and confirm the shell**

Run `npm run dev`, open at 375px wide. Expected: lands on the log tab, the taskbar has exactly three buttons (บันทึก · แผน · สรุป), the gear opens settings, and the console is clean.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: remove the game and investing layers"
```

---

### Task 3: Remove game sync from `gas/Code.gs`

**Files:**
- Modify: `gas/Code.gs` `gas/code.check.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `doPost` dispatching only `load` `save` `quick`.

- [ ] **Step 1: Rewrite `gas/code.check.mjs` to test the money actions instead**

Replace the `gameLoad`/`gameSave` assertions with: `save` then `load` round-trips a document whose month key is the string `'2026-11'` and comes back as the string `'2026-11'` (not a Date); `quick` appends an entry; an unknown action returns an error. Keep the existing `vm` harness and fake-sheet mock, and keep its simulation of Google Sheets coercing a date-like string into a `Date` — that bug has bitten this project before.

- [ ] **Step 2: Run it to verify it fails**

Run: `node gas/code.check.mjs`
Expected: FAIL — `gameLoad`/`gameSave` still exist and the new money assertions have not been proven.

- [ ] **Step 3: Delete the game code from `Code.gs`**

Remove `gameLoad` `gameSave` `GAME_COLS` `GAME_CHUNK`, the `GAME_SAVED_AT` property, their entries in the `doPost` dispatch table, and the line about the `game` tab in the file's header comment. Do not touch `load` `save` `quick` `writeAll` `sheet` `rows`, and do not add anything that deletes a `game` tab.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run check`
Expected: all check lines pass.

- [ ] **Step 5: Commit**

```bash
git add gas/Code.gs gas/code.check.mjs
git commit -m "refactor: drop game sync from the Apps Script backend"
```

---

### Task 4: `spendable()` — the daily number

**Files:**
- Modify: `src/money/logic.ts`
- Test: `src/money/logic.check.ts`

**Interfaces:**
- Consumes: `MoneyDb` `Row` `sum` `daysInMonth` `monthOf` `norm` from `logic.ts`.
- Produces:

```ts
export interface Spendable {
  hasPlan: boolean      // the month has at least one income row or one plan row
  income: number        // planned income rows; if the month has none, logged 'in' entries
  committed: number     // sum of plan rows, whether or not they are paid
  discretionary: number // 'out' entries whose note does NOT name a plan row
  left: number          // income − committed − discretionary (may be negative)
  daysLeft: number      // ≥ 1
  perDay: number        // left > 0 ? left / daysLeft : 0
}
export function spendable(db: MoneyDb, month: string, today: string): Spendable
```

`daysLeft` is `daysInMonth(month) − day + 1` when `month` is today's month, otherwise `daysInMonth(month)`. `discretionary` uses the same name-matching rule as Task 5, so the two must share one helper.

- [ ] **Step 1: Write the failing tests in `logic.check.ts`**

```ts
// --- spendable: bills are set aside for the whole month, paid or not ---
const SP: MoneyDb = {
  months: { '2026-11': { income: [{ id: 'i', name: 'เงินเดือน', amount: 30000 }],
    plan: [{ id: 'p', name: 'ค่าบ้าน', amount: 22000 }], buckets: [] } },
  entries: [
    { id: 'a', date: '2026-11-02', type: 'out', env: 'ค่าบ้าน', note: 'ค่าบ้าน', amount: 22000 },
    { id: 'b', date: '2026-11-05', type: 'out', env: 'อาหาร', note: 'ข้าวเที่ยง', amount: 3200 },
  ],
}
eq(spendable(SP, '2026-11', '2026-11-12').discretionary, 3200, 'the paid bill is not discretionary')
eq(spendable(SP, '2026-11', '2026-11-12').left, 4800, '30000 − 22000 − 3200')
eq(spendable(SP, '2026-11', '2026-11-12').daysLeft, 19, '12..30 inclusive')
eq(spendable(SP, '2026-11', '2026-11-30').daysLeft, 1, 'last day still divides by 1')
eq(spendable(SP, '2026-11', '2026-10-15').daysLeft, 30, 'another month divides by the whole month')
ok(spendable(SP, '2026-11', '2026-11-12').perDay > 252, 'about 253 a day')
// no plan at all (several of the imported months)
const BARE: MoneyDb = { months: {}, entries: [{ id: 'c', date: '2026-03-04', type: 'out', env: 'อื่นๆ', note: 'x', amount: 100 }] }
eq(spendable(BARE, '2026-03', '2026-03-10').hasPlan, false, 'no plan flagged')
eq(spendable(BARE, '2026-03', '2026-03-10').perDay, 0, 'never a negative or infinite per-day')
// income falls back to logged income when the month has no income row
const LOGGED: MoneyDb = { months: { '2026-04': { income: [], plan: [], buckets: [] } },
  entries: [{ id: 'd', date: '2026-04-01', type: 'in', env: 'รายรับ', note: 'เงินเดือน', amount: 20000 }] }
eq(spendable(LOGGED, '2026-04', '2026-04-10').income, 20000, 'falls back to logged income')
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run check`
Expected: FAIL — `spendable` is not exported.

- [ ] **Step 3: Implement `spendable` in `logic.ts`**

Put it next to `dailyBudget`. Leave `dailyBudget` in place for now; Task 9 removes it once nothing imports it.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check`
Expected: `money.check: all good`

- [ ] **Step 5: Commit**

```bash
git add src/money/logic.ts src/money/logic.check.ts
git commit -m "feat: spendable() sets bills aside for the whole month"
```

---

### Task 5: `paidNames()` — which plan rows are paid

**Files:**
- Modify: `src/money/logic.ts`
- Test: `src/money/logic.check.ts`

**Interfaces:**
- Consumes: `MoneyDb` `Row` `norm` `monthOf`.
- Produces:

```ts
/** Normalised notes of this month's 'out' entries that name a plan row. */
export function paidNames(db: MoneyDb, month: string): Set<string>
export function isPaid(row: Row, paid: Set<string>): boolean   // false for a blank name
/** The newest matching entry id, for the undo-a-payment button. Null when there is none. */
export function paidEntryId(db: MoneyDb, month: string, name: string): string | null
```

Matching rule: `norm(entry.note) === norm(row.name)` and `row.name.trim()` is non-empty. Amount is ignored.

- [ ] **Step 1: Write the failing tests in `logic.check.ts`**

```ts
// --- paid detection: note matches the row name, amount ignored ---
const PD: MoneyDb = {
  months: { '2026-11': { income: [], buckets: [], plan: [
    { id: '1', name: 'ค่าบ้าน', amount: 4500 },
    { id: '2', name: 'อาหาร', amount: 8000 },
    { id: '3', name: '', amount: 500 },
  ] } },
  entries: [
    { id: 'e1', date: '2026-11-01', type: 'out', env: 'ค่าบ้าน', note: ' ค่าบ้าน ', amount: 4000 },
    { id: 'e2', date: '2026-11-03', type: 'out', env: 'อาหาร', note: 'ข้าวเที่ยง', amount: 85 },
    { id: 'e3', date: '2026-10-01', type: 'out', env: 'ค่าบ้าน', note: 'ค่าบ้าน', amount: 4500 },
  ],
}
const paid = paidNames(PD, '2026-11')
ok(isPaid(PD.months['2026-11'].plan[0], paid), 'paid despite spaces and a smaller amount')
ok(!isPaid(PD.months['2026-11'].plan[1], paid), 'daily food notes do not pay the food row')
ok(!isPaid(PD.months['2026-11'].plan[2], paid), 'a blank row is never paid')
eq(paidEntryId(PD, '2026-11', 'ค่าบ้าน'), 'e1', 'this month only, newest first')
eq(paidEntryId(PD, '2026-11', 'ไม่มี'), null, 'nothing to undo')
// two rows sharing a name: both read as paid rather than crashing or picking one
const TWIN = { id: '4', name: 'ค่าบ้าน', amount: 900 }
ok(isPaid(TWIN, paid), 'a duplicate name is paid too')
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run check`
Expected: FAIL — `paidNames` is not exported.

- [ ] **Step 3: Implement the three functions in `logic.ts`**

Export the shared predicate that Task 4's `discretionary` also uses, so one rule serves both.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check`
Expected: `money.check: all good`

- [ ] **Step 5: Commit**

```bash
git add src/money/logic.ts src/money/logic.check.ts
git commit -m "feat: derive paid plan rows from logged entries"
```

---

### Task 6: Pick the date when logging, and change it afterwards

**Files:**
- Modify: `src/money/useMoney.ts` `src/money/QuickAdd.tsx` `src/money/LogView.tsx` `src/lib/i18n.ts`

**Interfaces:**
- Consumes: `todayISO` `monthOf` from `logic.ts`.
- Produces, from `useMoney()`:

```ts
entryDate: string                  // ISO date the next entry will use; defaults to todayISO()
setEntryDate: (d: string) => void  // also moves `cur` to that date's month
setDate: (id: string, date: string) => void  // edit an existing entry; also moves `cur`
addQuick: (text: string) => Entry | null     // drops the old `onToday` parameter
```

Setting a date in another month calls `setCur(monthOf({date}))` so the view follows the entry. `entryDate` lives in React state only — it is not persisted, so a fresh launch always starts on today.

- [ ] **Step 1: Replace `dateInMonth` with `entryDate` in `useMoney.ts`**

`addQuick` stamps `entryDate`. Delete `dateInMonth` from `logic.ts` and its assertions from `logic.check.ts` once nothing imports it.

- [ ] **Step 2: Add the date field to `QuickAdd.tsx`**

A native `<input type="date">` beside the text box, value `money.entryDate`, labelled from i18n. It keeps its value after a submit.

- [ ] **Step 3: Make the date editable on a logged row in `LogView.tsx`**

The day heading's rows get a way to change one entry's date that calls `money.setDate`. A native date input is fine. Target ≥ 44px.

- [ ] **Step 4: Verify back-dating into an empty month by hand**

Run the app, pick a date in a month with no entries, add one entry. Expected: the header month switches to that month and the new entry is the only row shown. (Review Focus 5.)

- [ ] **Step 5: Verify the checks**

Run: `npx tsc -b && npm run check`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: choose the date of an entry when logging and afterwards"
```

---

### Task 7: "จ่ายแล้ว" on plan rows

**Files:**
- Modify: `src/money/PlanView.tsx` `src/money/useMoney.ts` `src/lib/i18n.ts`

**Interfaces:**
- Consumes: `paidNames` `isPaid` `paidEntryId` (Task 5), `entryDate` `delEntry` `snapshot`/undo (Task 6 and the existing undo bar).
- Produces, from `useMoney()`:

```ts
payRow: (row: Row) => void    // logs { date: entryDate, type: 'out', env: row.name, note: row.name, amount: row.amount }
unpayRow: (row: Row) => void  // deletes paidEntryId(...) through the existing undoable delete
```

Neither function touches `n`, `of`, or `total`.

- [ ] **Step 1: Add `payRow` and `unpayRow` to `useMoney.ts`**

- [ ] **Step 2: Add the button to both row lists in `PlanView.tsx`**

Every named row in รายจ่ายประจำ and in หนี้/ผ่อน gets one button: unpaid shows "จ่ายแล้ว" and calls `payRow`; paid shows a tick plus the row dimmed, and calls `unpayRow`. Rows with a blank name show no button.

- [ ] **Step 3: Add the header tally**

Above the two lists: how many rows are paid out of how many named rows, and the summed amount of the unpaid ones.

- [ ] **Step 4: Verify an installment row by hand**

Run the app, open a month with an installment row, note its งวดที่ number, tap จ่ายแล้ว, and check the number and the payoff month are unchanged. Then tap again and confirm the entry is gone and the undo bar offers it back.

- [ ] **Step 5: Verify the checks**

Run: `npx tsc -b && npm run check && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pay a plan row in one tap"
```

---

### Task 8: Week and year data for the summary

**Files:**
- Modify: `src/money/logic.ts`
- Test: `src/money/logic.check.ts`

**Interfaces:**
- Consumes: `MoneyDb` `weekStart` `addDays` `monthOf` `sum` `yearMonths`.
- Produces:

```ts
export function weekDays(db: MoneyDb, today: string): { date: string; total: number }[]  // 7, Monday first
export function monthTotals(db: MoneyDb, year: string): { month: string; total: number }[]  // 12, Jan first
export function envTotals(db: MoneyDb, month: string): { label: string; value: number }[]   // desc by value
export function dayTotals(db: MoneyDb, month: string): Record<string, number>               // ISO date -> spent
```

All four count `type === 'out'` only.

- [ ] **Step 1: Write the failing tests in `logic.check.ts`**

```ts
// --- summary data ---
const SUM: MoneyDb = { months: {}, entries: [
  { id: 'w1', date: '2026-11-09', type: 'out', env: 'อาหาร', note: 'a', amount: 100 }, // Monday
  { id: 'w2', date: '2026-11-12', type: 'out', env: 'อาหาร', note: 'b', amount: 50 },
  { id: 'w3', date: '2026-11-12', type: 'out', env: 'น้ำมัน', note: 'c', amount: 700 },
  { id: 'w4', date: '2026-11-15', type: 'in', env: 'รายรับ', note: 'd', amount: 9000 },
  { id: 'y1', date: '2026-03-02', type: 'out', env: 'อาหาร', note: 'e', amount: 400 },
] }
eq(weekDays(SUM, '2026-11-12').length, 7, 'seven days')
eq(weekDays(SUM, '2026-11-12')[0].date, '2026-11-09', 'starts Monday')
eq(weekDays(SUM, '2026-11-12')[3].total, 750, 'Thursday adds up')
eq(sum(weekDays(SUM, '2026-11-12'), d => d.total), 850, 'income is not spending')
eq(monthTotals(SUM, '2026').length, 12, 'twelve months')
eq(monthTotals(SUM, '2026')[2].total, 400, 'March')
eq(monthTotals(SUM, '2026')[0].total, 0, 'an empty month is zero, not missing')
eq(envTotals(SUM, '2026-11')[0], { label: 'น้ำมัน', value: 700 }, 'biggest first')
eq(envTotals(SUM, '2026-11').at(-1)!.label, 'อาหาร', 'smallest last')
eq(dayTotals(SUM, '2026-11')['2026-11-12'], 750, 'per-day total')
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run check`
Expected: FAIL — the four functions are not exported.

- [ ] **Step 3: Implement the four functions in `logic.ts`**

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check`
Expected: `money.check: all good`

- [ ] **Step 5: Commit**

```bash
git add src/money/logic.ts src/money/logic.check.ts
git commit -m "feat: week, year, envelope and per-day totals"
```

---

### Task 9: Rebuild the summary as one scrolling page

**Files:**
- Rewrite: `src/money/SummaryView.tsx`
- Modify: `src/money/charts.tsx` `src/lib/i18n.ts` `src/money/logic.ts`

**Interfaces:**
- Consumes: `spendable` (Task 4), `weekDays` `monthTotals` `envTotals` (Task 8), `Donut` `BarsH` from `charts.tsx`.
- Produces: nothing other tasks use.

- [ ] **Step 1: Add a vertical-bar component to `charts.tsx`**

```tsx
export interface VBar { label: string; value: number; now?: boolean; dim?: boolean }
export function BarsV({ rows, empty, onPick }: { rows: VBar[]; empty: string; onPick?: (i: number) => void }): JSX.Element
```

One component serves both the 7-day and the 12-month charts. Every bar carries its value as text, not only as height. When `onPick` is given each bar is a button with an accessible name of label plus value.

- [ ] **Step 2: Rewrite `SummaryView.tsx` as four stacked sections, no mode switch**

In order: **(1) วันนี้เหลือใช้ได้** — the page's largest number from `spendable`, with the month's remaining total and days left; when `hasPlan` is false, show a line telling the user to set a plan instead of a number. **(2) สัปดาห์นี้** — `weekDays` in `BarsV`, plus the week's total, its heaviest day, and the daily average. **(3) เดือนนี้** — spent versus planned, the donut, and `envTotals` in `BarsH` with words naming the biggest and smallest envelope. **(4) ทั้งปี** — `monthTotals` in `BarsV`, current month highlighted, months after it dimmed, `onPick` switching the header month.

Sections 1 and 2 render only when the selected month is the current month. (Review Focus 4.)

- [ ] **Step 3: Delete `dailyBudget`**

Remove it from `logic.ts` and its assertions from `logic.check.ts` once `spendable` has replaced its last use, including in `LogView.tsx`.

- [ ] **Step 4: Verify in the browser at 375px**

Run the app with a month of seeded entries. Expected: no mode buttons anywhere on the page; all four sections visible by scrolling; picking a past month hides sections 1 and 2; picking next month also hides them and shows no negative days; tapping a year bar changes the header month.

- [ ] **Step 5: Verify the checks**

Run: `npx tsc -b && npm run check && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: one summary page from today to the whole year"
```

---

### Task 10: Calendar without the game

**Files:**
- Modify: `src/money/CalendarView.tsx` `src/lib/i18n.ts`

**Interfaces:**
- Consumes: `dayTotals` (Task 8), `spendable` (Task 4), `eventsInMonth` from `calendar.ts`.
- Produces: nothing other tasks use.

- [ ] **Step 1: Replace the tile states**

`Tile` becomes `'over' | 'under' | 'none' | 'future'`. A past or present day with spending is `over` when its total exceeds the month's per-day figure from `spendable`, otherwise `under`. Drop the `rest` tile, the `dayLog` and `validRest` imports, and the `rest` legend entry.

- [ ] **Step 2: Put the number in the tile**

Each spent day shows its rounded total as text inside the tile, so the state does not depend on color alone.

- [ ] **Step 3: Verify in the browser**

Expected: the legend has two states, tapping a day still jumps to that day's entries, and no day is coloured by a rule that no longer exists.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: calendar shows spending against the daily figure"
```

---

### Task 11: Plain visual style

**Files:**
- Rewrite: `src/index.css` `src/components/ui.tsx`
- Modify: every file under `src/money/` and `src/App.tsx` that uses a retro class

**Interfaces:**
- Consumes: everything above.
- Produces: `Panel` `Bar` `Field` `inputCls` keep their current props so no caller changes shape. `TitleBar` and `WinControls` are deleted; `Panel` renders its own heading.

- [ ] **Step 1: Rewrite `src/index.css`**

Drop `@keyframes` and classes that only served sprites and the hero scene; drop `bevel` `sunken` `track` `segmented` `pixel` and the `font-rpg` family; drop the `retro-*` colors and the remapped `slate-*` ramp. Define a plain surface set — page, card, border, text, muted — as CSS variables for light and `:root[data-theme="dark"]`, keep a monospace family for figures, restore normal border radii, and remove the grid background from `body`. Keep the `--s1`…`--s7` category palette unchanged: it was already checked for color-blind separation.

- [ ] **Step 2: Rewrite `src/components/ui.tsx`**

`Panel` becomes a card with a quiet heading row (icon, title, optional action) and a body. `Bar` keeps its props and `role="progressbar"` and loses the segment overlay. Delete `TitleBar` and `WinControls`.

- [ ] **Step 3: Sweep the remaining retro classes out of the views**

Run `grep -rn "bevel\|sunken\|font-rpg\|retro-\|segmented\|pixel" src` and replace each hit. The grep must come back empty.

- [ ] **Step 4: Check contrast in both themes**

Write a throwaway node script that computes the WCAG ratio for every text-on-surface pair the new tokens define, in light and dark. Expected: every pair ≥ 4.5:1. Fix any that fail and keep the script's output in the commit message.

- [ ] **Step 5: Check the tap targets at 375px**

In the browser, measure every `button`, `select`, and `[role=tab]`. Expected: none smaller than 24px in either dimension; the quick-add button, the date fields, the delete buttons, the envelope selects, the จ่ายแล้ว buttons, and the taskbar buttons all ≥ 44px.

- [ ] **Step 6: Check both themes and both languages**

Expected: no white flash when the app opens in dark mode; every screen readable in both themes; Thai and English both laid out without overflow at 375px.

- [ ] **Step 7: Verify the checks**

Run: `npx tsc -b && npm run check && npm run build`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: plain visual style in place of the pixel theme"
```

---

### Task 12: Ship it

**Files:**
- Modify: `README.md` `public/manifest.webmanifest` `index.html` `.github/workflows/deploy.yml` (only if it references the deleted price server)

**Interfaces:**
- Consumes: everything above.
- Produces: a deployed site.

- [ ] **Step 1: Rewrite `README.md` for the app that now exists**

Remove the investing and price-server sections and the game tables. Keep the setup steps for the sheet and Apps Script. Append a changelog entry dated 2026-11-12 describing this change, and a "Next steps" list, as this project's log requires.

- [ ] **Step 2: Update the app's own name and icon text**

`index.html` title, `manifest.webmanifest` `name` and `short_name`, and the header title in `App.tsx` should all say what the app is now. Keep `start_url` and `scope` so an installed copy keeps working.

- [ ] **Step 3: Confirm the deploy workflow still matches the repo**

Expected: it builds the Vite app and publishes `dist`, with no step referring to `server/` or the deleted scripts.

- [ ] **Step 4: Full verification**

Run: `npx tsc -b && npm run check && npm run build`
Expected: clean. Then open the built app at 375px and walk the three tabs once.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "docs: README for the money-only app"
git push origin main
```

- [ ] **Step 6: Confirm the live site**

Check the Pages run succeeded and open `https://twnote05.github.io/IRPG-INCOME-GAME/`. Expected: the three-tab app loads, the console is clean, and existing sheet data still appears after connecting.
