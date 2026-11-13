import { BarChart3, CalendarDays, PieChart, Wallet } from 'lucide-react'
import type { Dict, Lang } from '../lib/i18n'
import { Panel } from '../components/ui'
import { BarsH, BarsV, Donut } from './charts'
import { envTotals, monthTotals, spendable, sum, thisMonth, todayISO, weekDays } from './logic'
import { dayLabel, fmt, fmt0, monthLabel } from './fmt'
import type { Money } from './useMoney'

const wd = (iso: string, lang: Lang) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' })
}

/**
 * One scrolling page, nearest to furthest: today, this week, the month, the year. No mode switch —
 * today and the week only exist for the real current month; a past or future month simply omits them.
 */
export default function SummaryView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { db, cur } = money
  const today = todayISO(), nowMonth = thisMonth()
  const isNow = cur === nowMonth
  const year = cur.slice(0, 4)
  const T = t.money

  const sp = spendable(db, cur, today)
  const week = weekDays(db, today)
  const todayIdx = week.findIndex(d => d.date === today)
  const weekSum = sum(week, d => d.total)
  const peak = week.reduce((a, d) => (d.total > a.total ? d : a), week[0])
  const envs = envTotals(db, cur)
  const spent = sum(envs, e => e.value)
  const planned = sp.committed
  const months = monthTotals(db, year)

  return (
    <div className="space-y-3">
      {isNow && (
        <Panel title={T.perDayLeft} icon={Wallet}>
          {sp.hasPlan ? (
            <div className="text-center">
              <div className={`font-mono text-5xl font-bold ${sp.left > 0 ? 'text-ink' : 'text-neg'}`}>{fmt0(sp.left > 0 ? sp.perDay : -sp.left)}</div>
              <div className="mt-1 text-xs text-muted">
                {sp.left > 0 ? T.leftDays(fmt0(sp.left), sp.daysLeft) : `${T.overPlan} · ${T.daysToEnd(sp.daysLeft)}`}
              </div>
            </div>
          ) : <p className="py-2 text-center text-sm text-muted">{T.setPlanHint}</p>}
        </Panel>
      )}

      {isNow && (
        <Panel title={T.sumWeek} icon={CalendarDays}>
          <BarsV empty={T.noSpend} nowText={T.nowMark}
            rows={week.map((d, i) => ({ label: wd(d.date, lang), value: d.total, now: i === todayIdx }))} />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div><dt className="text-muted">{T.weekTotal}</dt><dd className="font-mono font-bold">{fmt0(weekSum)}</dd></div>
            <div><dt className="text-muted">{T.weekPeak}</dt><dd className="font-mono font-bold">{peak.total ? `${dayLabel(peak.date, lang)} · ${fmt0(peak.total)}` : '–'}</dd></div>
            <div><dt className="text-muted">{T.weekAvg}</dt><dd className="font-mono font-bold">{fmt0(weekSum / (todayIdx + 1))}</dd></div>
          </dl>
        </Panel>
      )}

      <Panel title={T.sumMonth(monthLabel(cur, lang))} icon={PieChart}>
        {/* a month that hasn't happened yet has not been "spent this month" */}
        {cur > nowMonth && !spent ? (
          <p className="py-2 text-center text-sm text-muted">{T.futureMonth}</p>
        ) : (
        <div className="text-center">
          <div className="text-[11px] text-muted">{T.spentMonth}</div>
          <div className={`font-mono text-3xl font-bold ${planned && spent > planned ? 'text-neg' : 'text-ink'}`}>{fmt(spent)}</div>
          <div className="text-xs text-muted">
            {planned ? (spent > planned ? T.overBy(fmt0(spent - planned)) : T.underPlan(fmt0(planned - spent))) : T.noPlan}
          </div>
        </div>
        )}
        <div className="mt-3">
          <Donut rows={envs} totalLabel={T.total} empty={T.noSpend} otherLabel={T.otherN} />
        </div>
        {envs.length > 0 && (
          <div className="mt-3">
            <BarsH empty={T.noData} rows={envs} />
            <p className="mt-3 text-xs">
              {T.biggest(envs[0].label, fmt0(envs[0].value))}
              {envs.length > 1 && <> · {T.smallest(envs[envs.length - 1].label, fmt0(envs[envs.length - 1].value))}</>}
            </p>
          </div>
        )}
      </Panel>

      <Panel title={T.sumYear(year)} icon={BarChart3}>
        <BarsV empty={T.noSpend} nowText={T.nowMark} onPick={i => money.setCur(months[i].month)}
          rows={months.map(m => ({
            label: monthLabel(m.month, lang).split(' ')[0], value: m.total,
            now: m.month === nowMonth, dim: m.month > nowMonth, sel: m.month === cur,
          }))} />
      </Panel>
    </div>
  )
}
