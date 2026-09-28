import { motion } from 'framer-motion'
import { BookOpen, Circle, CircleCheck, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { QUESTS, questReward } from '../lib/game'
import type { Game } from '../lib/useGame'
import { Panel } from './ui'

export default function QuestLog({ game }: { game: Game }) {
  const { isDone, completeQuest, t } = game
  const [tip, setTip] = useState(() => Math.floor(Date.now() / 864e5)) // tip of the day
  return (
    <Panel title={t.quests.title} icon={ScrollText} glow="emerald">
      {(['daily', 'weekly', 'quarterly', 'yearly'] as const).map(period => (
        <div key={period} className="mb-3 last:mb-0">
          <div className="mb-1.5 flex justify-between gap-2 text-[10px] tracking-widest text-slate-500 uppercase">
            <span>{t.quests.period[period]}</span><span>{t.quests.reset[period]}</span>
          </div>
          <ul className="space-y-1.5">
            {QUESTS.filter(q => q.period === period).map(q => {
              const done = isDone(q)
              return (
                <li key={q.id}>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={done} onClick={() => completeQuest(q)}
                    className={`flex min-h-11 w-full items-center gap-2 border px-3 py-2 text-left text-sm transition ${done ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-500' : 'border-slate-700 bg-slate-950/40 text-slate-200 hover:border-emerald-500/60'}`}>
                    {done ? <CircleCheck size={16} className="shrink-0 text-emerald-700" /> : <Circle size={16} className="shrink-0 text-slate-500" />}
                    <span className={`flex-1 ${done ? 'line-through' : ''}`}>{t.quests.names[q.id]}</span>
                    <span className="shrink-0 font-mono text-[11px] text-amber-800">+{questReward(game.s, q).exp} EXP</span>
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <button onClick={() => setTip(n => n + 1)} title={t.quests.nextTip}
        className="mt-1 flex w-full gap-2 border border-violet-500/30 bg-violet-500/10 p-2.5 text-left text-xs text-violet-700 hover:border-violet-400">
        <BookOpen size={14} className="mt-0.5 shrink-0" />
        <span><span className="font-semibold">{t.quests.sage}</span>{t.tips[tip % t.tips.length]}</span>
      </button>
    </Panel>
  )
}
