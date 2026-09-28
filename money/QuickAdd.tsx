import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { Sprite } from '../components/Sprite'
import { inputCls } from '../components/ui'
import type { Dict } from '../lib/i18n'
import { fmt0 } from './fmt'
import type { Money } from './useMoney'

/** The everyday quick-add box, plus the treasure-chest popup when income lands. */
export default function QuickAdd({ money, t, onToday = false }: { money: Money; t: Dict; onToday?: boolean }) {
  const { summary } = money
  const [text, setText] = useState('')
  const [shake, setShake] = useState(false)
  const [loot, setLoot] = useState<{ id: string; amount: number } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const added = money.addQuick(text, onToday)
    if (added) {
      setText('')
      if (added.type === 'in') { // payday loot drop
        setLoot({ id: added.id, amount: added.amount })
        setTimeout(() => setLoot(l => (l?.id === added.id ? null : l)), 2600)
      }
    }
    else { setShake(true); setTimeout(() => setShake(false), 400); input.current?.focus() }
  }

  return (
    <>
      <AnimatePresence>
        {loot && (
          <motion.div key={loot.id} role="status" onClick={() => setLoot(null)}
            initial={{ opacity: 0, scale: 0.6, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="bevel fixed inset-x-6 top-1/3 z-50 mx-auto max-w-sm bg-slate-900 p-4 text-center">
            <div className="relative mx-auto w-fit">
              <motion.div animate={{ y: [0, -10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 0.6 }}>
                <Sprite name="chestOpen" size={96} />
              </motion.div>
              {/* sparkle particles */}
              {[[-28, -6, 0], [92, 4, 0.25], [-12, 60, 0.5], [84, 58, 0.15], [36, -26, 0.4]].map(([x, y, delay]) => (
                <span key={`${x}${y}`} className="absolute" style={{ left: x, top: y, animation: `twinkle 0.9s ${delay}s steps(3) infinite` }}>
                  <Sprite name="sparkle" size={16} />
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 font-rpg text-2xl text-amber-700"><Sprite name="coin" size={32} /> {t.adv.loot(fmt0(loot.amount))}</div>
            {summary.investPct > 0 && summary.income > 0 && (
              <div className="mt-1 text-xs text-blue-700">{t.adv.lootInvest(fmt0(summary.investBudget), summary.investPct)}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={submit} className={`bevel flex gap-2 bg-slate-900 p-2 ${shake ? 'animate-[shake_0.35s]' : ''}`}>
        <input ref={input} className={`${inputCls} min-w-0 flex-1`} value={text} onChange={e => setText(e.target.value)}
          placeholder={t.money.quickPh} aria-label={t.money.quickAria} autoComplete="off" enterKeyHint="done" />
        <button className="btn btn-primary min-h-11 shrink-0 px-4 font-bold">{t.money.add}</button>
      </form>
      <p className="mt-1.5 px-1 text-[11px] text-slate-500">{t.money.hint}</p>
    </>
  )
}
