import { motion } from 'framer-motion'
import { Activity, Swords } from 'lucide-react'
import { useState } from 'react'
import { BOSS_REWARD, boost, boosted, monthKey, thb, volatilityHit } from '../lib/game'
import type { Game } from '../lib/useGame'
import { Bar, Panel, inputCls } from './ui'
import { Hero, Sprite } from './Sprite'
import { usePoseFlash } from '../lib/usePoseFlash'

export function PaydayBoss({ game }: { game: Game }) {
  const { s, stats, deposit, t } = game
  const [assetId, setAssetId] = useState('')
  const [amount, setAmount] = useState('')
  const max = s.profile.monthlyBudget
  const bossHp = Math.max(0, max - stats.deposited)
  const defeated = s.bossDefeated === monthKey()
  const target = assetId || s.assets[0]?.id || ''
  const amt = Number(amount || bossHp)
  const [flash, play] = usePoseFlash()

  return (
    <Panel title={t.boss.title} icon={Swords} glow="ruby">
      <div className="flex items-center gap-3">
        <Hero equip={s.equip} look={s.look} pose={flash ?? (defeated ? 'cheer' : 'idle')} size={80} />
        <motion.div key={stats.deposited} animate={{ x: [0, -6, 6, -4, 4, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 0.4 }}
          className={`grid size-16 shrink-0 place-items-center border ${defeated ? 'border-slate-700 bg-slate-800 text-slate-600' : 'border-red-500/50 bg-red-500/15 text-red-700'}`}>
          <Sprite name={defeated ? 'skull' : 'dragon'} size={48} className={defeated ? 'opacity-60' : ''} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="font-rpg font-bold text-slate-100">{t.boss.name}</div>
          <div className="mb-1 text-[11px] text-slate-400">{(r => defeated ? t.boss.defeated(r.exp) : t.boss.reward(r.exp, r.gold))(boosted(BOSS_REWARD, boost(s, 'boss')))}</div>
          <Bar value={bossHp} max={max} color="bg-red-700" />
          <div className="mt-0.5 text-right font-mono text-[10px] text-slate-500">{thb(bossHp)} / {thb(max)}</div>
        </div>
      </div>

      {s.assets.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">{t.boss.needAsset}</p>
      ) : (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); play('attack', 1200); deposit(target, amt); setAmount('') }}>
          <select className={`${inputCls} min-w-0 flex-1`} value={target} onChange={e => setAssetId(e.target.value)} aria-label={t.boss.depositInto}>
            {s.assets.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
          </select>
          <input className={`${inputCls} !w-28`} type="number" inputMode="numeric" min={1} placeholder={bossHp ? String(bossHp) : t.boss.amount} value={amount}
            onChange={e => setAmount(e.target.value)} aria-label={t.boss.amountAria} />
          <button disabled={!(amt > 0)} className="btn btn-danger min-h-11 w-full font-bold">{t.boss.strike}</button>
        </form>
      )}
    </Panel>
  )
}

export function VolatilityEvent({ game }: { game: Game }) {
  const { stats, t } = game
  const [crash, setCrash] = useState(30)
  const hit = volatilityHit(stats, crash)
  const hpLeft = stats.totalValue > 0 ? ((stats.totalValue - hit.taken) / stats.totalValue) * 100 : 100

  return (
    <Panel title={t.boss.volTitle} icon={Activity} glow="gold">
      <label className="block">
        <div className="flex justify-between text-xs"><span className="text-slate-400">{t.boss.crash}</span><span className="font-mono text-red-700">−{crash}%</span></div>
        <input type="range" min={5} max={60} step={5} value={crash} onChange={e => setCrash(Number(e.target.value))} className="h-6 w-full" />
      </label>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="bg-slate-950/50 p-2"><div className="text-slate-500">{t.boss.raw}</div><div className="font-mono text-red-700">{thb(hit.raw)}</div></div>
        <div className="bg-slate-950/50 p-2"><div className="text-slate-500">{t.boss.blocked}</div><div className="font-mono text-emerald-700">{thb(hit.blocked)}</div></div>
        <div className="bg-slate-950/50 p-2"><div className="text-slate-500">{t.boss.taken}</div><div className="font-mono text-amber-800">{thb(hit.taken)}</div></div>
      </div>
      <div className="mt-2"><Bar value={hpLeft} max={100} color="bg-emerald-600" /></div>
      <p className="mt-1.5 text-[10px] text-slate-500">{t.boss.volNote(stats.def, Math.round(stats.def / 2))}</p>
    </Panel>
  )
}
