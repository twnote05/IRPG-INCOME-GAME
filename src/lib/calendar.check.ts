// Run: npm run check
import assert from 'node:assert/strict'
import { daysBetween, eventsInMonth, paydayOf, seasonOn, shiftDays, skyAt, upcoming } from './calendar.ts'
const eq = (a: unknown, b: unknown, m: string) => assert.deepEqual(a, b, m)

eq(paydayOf('2026-10'), '2026-10-30', 'Oct 31 2026 is a Saturday → last weekday Fri 30')
eq(paydayOf('2026-09'), '2026-09-30', 'Sep 30 2026 is a Wednesday')
eq(paydayOf('2026-02', 30), '2026-02-28', 'fixed day clamps to month length')
eq(paydayOf('2026-02', 25), '2026-02-25', 'fixed day')
eq(daysBetween('2026-12-30', '2027-01-02'), 3, 'across the year end')
eq(shiftDays('2026-03-01', -1), '2026-02-28', 'shift back into February')
eq(eventsInMonth('2026-11').map(e => e.id), ['sale11', 'loykrathong', 'payday'], 'November: 11.11, Loy Krathong, payday')
eq(eventsInMonth('2026-02').map(e => e.id), ['valentine', 'cny', 'payday'], 'February 2026: CNY on the 17th')
const up = upcoming('2026-12-28', 10)
eq(up.map(e => [e.id, e.inDays]), [['taxbuy', 3], ['nye', 3], ['payday', 3], ['newyear', 4]], 'upcoming crosses into next year')
eq([seasonOn('2026-04-14'), seasonOn('2026-11-25'), seasonOn('2026-12-24'), seasonOn('2027-01-01'), seasonOn('2027-02-08'), seasonOn('2026-09-28')],
  ['songkran', 'loykrathong', 'christmas', 'newyear', 'cny', null], 'scene decorations')
eq([skyAt(6), skyAt(12), skyAt(18), skyAt(23), skyAt(3)], ['dawn', 'day', 'dusk', 'night', 'night'], 'sky by hour')
console.log('calendar.check: all good')
