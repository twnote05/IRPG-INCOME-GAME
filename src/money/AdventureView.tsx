import { Award, Castle, Gem, ScrollText, Skull, Swords } from 'lucide-react'
import type { Dict, Lang } from '../lib/i18n'
import { MONSTERS } from '../lib/sprites'
import { Sprite } from '../components/Sprite'
import { Bar, Panel } from '../components/ui'
import { ACHIEVEMENTS, CHEST_STEPS, REWARD, addDays, battleLog, isDebt, monsters, monthOf, payoffMonth, periodN, sum, thisMonth, todayISO, weekChallenge, weekStart } from './logic'
import { dayLabel, fmt0, monthLabel } from './fmt'
import type { Money } from './useMoney'

/** Same envelope name → same monster on every visit. */
const face = (name: string) => MONSTERS[[...name].reduce((a, c) => a + c.codePointAt(0)!, 0) % MONSTERS.length]
const STATE_CLS = { ok: 'text-slate-500', warn: 'text-amber-800', over: 'text-red-700' }
const BAR_CLS = { ok: 'bg-emerald-600', warn: 'bg-amber-500', over: 'bg-red-600' }

export default function AdventureView({ money, t, lang }: { money: Money; t: Dict; lang: Lang }) {
  const { db, cur, month, goalList, summary, rest } = money
  const got = new Set(summary.rewards.map(r => r.id))
  const outs = db.entries.filter(e => e.type === 'out' && monthOf(e) === cur)
  const mobs = monsters(month?.plan ?? [], n => sum(outs.filter(e => e.env === n)))
  const debts = (month?.plan ?? []).filter(r => r.name && isDebt(r))
  const cleared = summary.rewards.filter(r => r.kind === 'dungeon').length
  const today = todayISO()
  const wk = weekStart(today)
  const ch = weekChallenge(db, wk, rest, today)
  const lastOk = got.has(`challenge:${addDays(wk, -7)}`)
  const [chName, chHow] = t.adv.ch[ch.id]
  const bl = battleLog(db, rest, today)
  const nowMobs = cur === thisMonth() ? mobs : monsters(db.months[thisMonth()]?.plan ?? [], n => sum(db.entries.filter(e => e.type === 'out' && monthOf(e) === thisMonth() && e.env === n)))
  const story = t.adv.story({
    spent: fmt0(bl.spent), hits: bl.hits, active: bl.active, good: bl.good, hurt: bl.hurt, rest: bl.rest,
    top: bl.top && `${bl.top.name} (${fmt0(bl.top.amount)})`, big: bl.biggest && `${bl.biggest.note} ${fmt0(bl.biggest.amount)}`,
    income: bl.income ? fmt0(bl.income) : null,
    enraged: nowMobs.filter(m => m.state === 'warn').length, beat: nowMobs.filter(m => m.state === 'over').length,
  })

  return (
    <div className="space-y-3">
      <Panel title={t.adv.week} icon={Swords} glow="mana">
        <div className="flex items-center gap-3">
          <Sprite name={ch.done ? 'trophy' : 'scroll'} size={48} className={ch.done ? 'animate-idle' : ''} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap justify-between gap-x-2 text-xs">
              <b className="text-slate-100">{chName}</b>
              <span className="text-slate-500">{t.adv.weekRange(dayLabel(ch.start, lang), dayLabel(ch.end, lang))}</span>
            </div>
            <div className="text-[11px] text-slate-400">{chHow}</div>
            <Bar value={ch.n} max={ch.goal} color={ch.done ? 'bg-amber-500' : 'bg-blue-600'} className="my-1 h-2.5" />
            <div className="flex flex-wrap justify-between gap-x-2 text-[11px] text-slate-500">
              <span>{ch.done ? <b className="text-emerald-700">{t.adv.chDone}</b> : `${ch.n}/${ch.goal}`} · +{REWARD.challenge[0]} EXP</span>
              <span>{t.adv.chLast(lastOk)}</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={t.adv.report} icon={ScrollText} glow="gold">
        <ul className="space-y-1 text-sm text-slate-200">
          {story.map(line => <li key={line}>▸ {line}</li>)}
        </ul>
      </Panel>

      <Panel title={t.adv.dungeon(monthLabel(cur, lang))} icon={Castle} glow="ruby">
        <p className="mb-2 text-[11px] text-slate-500">{t.adv.dungeonHint}</p>
        {mobs.length === 0 ? <p className="text-xs text-slate-500">{t.adv.noMonsters}</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mobs.map(m => (
              <li key={m.name} className={`sunken flex items-center gap-2.5 p-2 ${m.state === 'over' ? 'opacity-70' : ''}`}>
                <Sprite name={m.state === 'over' ? 'skull' : face(m.name)} size={48}
                  className={m.state === 'warn' ? 'animate-[shake_0.6s_infinite]' : m.state === 'ok' ? 'animate-idle' : ''} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate font-semibold text-slate-100">{m.name}</span>
                    <span className={`shrink-0 ${STATE_CLS[m.state]}`}>{t.adv.mState[m.state]}</span>
                  </div>
                  <Bar value={m.hp} max={m.max} color={BAR_CLS[m.state]} className="my-1 h-2" />
                  <div className="font-mono text-[11px] text-slate-500">{t.adv.hpLeft(fmt0(m.hp), fmt0(m.max))}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-slate-500">
          <span>{t.adv.cleared(cleared)}</span>
          <span>{got.has(`dungeon:${cur}`) ? '✔ ' : ''}{t.adv.dungeonReward(REWARD.dungeon[0])}</span>
        </div>
      </Panel>

      <Panel title={t.adv.dragons} icon={Skull} glow="gold">
        <p className="mb-2 text-[11px] text-slate-500">{t.adv.dragonHint}</p>
        {debts.length === 0 ? <p className="text-xs text-slate-500">{t.adv.noDragons}</p> : (
          <ul className="space-y-2">
            {debts.map(r => {
              const n = periodN(r), of = r.of ?? 0, per = +r.amount || 0
              const max = +(r.total ?? 0) || of * per, hp = Math.max(0, max - n * per)
              const dead = !!of && n >= of
              const end = payoffMonth(r, cur)
              return (
                <li key={r.id} className="sunken flex items-center gap-2.5 p-2">
                  <Sprite name={dead ? 'skull' : 'dragon'} size={48} className={dead ? '' : 'animate-idle'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-slate-100">{r.name}</span>
                      <span className="shrink-0 text-slate-500">{dead ? <b className="text-emerald-700">{t.adv.slain}</b> : of ? t.adv.hits(n, of) : ''}</span>
                    </div>
                    {max > 0 && <Bar value={dead ? 0 : hp} max={max} color="bg-red-600" className="my-1 h-2" />}
                    <div className="flex justify-between gap-2 font-mono text-[11px] text-slate-500">
                      <span>{max > 0 ? t.adv.hpLeft(fmt0(dead ? 0 : hp), fmt0(max)) : ''}</span>
                      {!dead && end && <span>{t.adv.slayBy(monthLabel(end, lang))}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel title={t.adv.chests} icon={Gem} glow="emerald">
        <p className="mb-2 text-[11px] text-slate-500">{t.adv.chestHint}</p>
        {goalList.length === 0 ? <p className="text-xs text-slate-500">{t.adv.noChests}</p> : (
          <div className="space-y-3">
            {goalList.map(g => (
              <div key={g.name}>
                <div className="mb-1 flex justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1 text-slate-200">{g.reached && <Sprite name="trophy" size={16} />}<span className="truncate">{g.name}</span></span>
                  <span className="shrink-0 font-mono text-slate-400">{fmt0(g.saved)} / {fmt0(g.target)} · {g.pct.toFixed(0)}%</span>
                </div>
                <Bar value={g.saved} max={g.target} color={g.reached ? 'bg-amber-500' : 'bg-emerald-600'} />
                <div className="mt-1 grid grid-cols-4 justify-items-center text-center">
                  {CHEST_STEPS.map(st => (
                    <span key={st} title={`${st}%`} className={g.pct >= st ? '' : 'opacity-50'}>
                      <Sprite name={g.pct >= st ? (st === 100 ? 'crown' : 'chestOpen') : 'chest'} size={32} /><span className="block text-[10px] text-slate-500">{st}%</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={t.adv.badges} icon={Award} glow="mana">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACHIEVEMENTS.map(a => {
            const on = got.has(`ach:${a}`)
            const [name, how] = t.adv.ach[a]
            return (
              <li key={a} className={`sunken p-2 text-center ${on ? '' : 'opacity-50'}`} title={how}>
                <Sprite name={on ? 'medal' : 'lock'} size={32} className={on ? 'mx-auto' : 'mx-auto opacity-60'} />
                <div className="text-xs font-semibold text-slate-100">{name}</div>
                <div className="text-[10px] text-slate-500">{how}</div>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}
