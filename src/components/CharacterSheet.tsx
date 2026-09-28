import { motion } from 'framer-motion'
import { AlertTriangle, Brain, Droplet, Dumbbell, Heart, Pencil, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import type { Job, Profile } from '../types'
import { BEARDS, HAIRS, HAIR_COLORS, JOBS, JOB_KEYS, SCENES, SKINS, frameCls, thb } from '../lib/game'
import type { Dict } from '../lib/i18n'
import type { Game } from '../lib/useGame'
import { Bar, Field, Panel, inputCls } from './ui'
import { Hero, Sprite } from './Sprite'


export default function CharacterSheet({ game }: { game: Game }) {
  const { s, stats, updateProfile, t } = game
  const p = s.profile
  const [editing, setEditing] = useState(false)
  const hpCritical = stats.hp <= 0
  const hpLow = !hpCritical && stats.monthsCovered < Math.min(3, stats.hpMonths)
  const job = p.job ?? 'salaried'

  return (
    <Panel title={t.sheet.title} icon={User} glow="gold"
      action={<button onClick={() => setEditing(e => !e)} className="btn px-1.5 py-0.5" aria-label={t.sheet.edit} aria-expanded={editing}><Pencil size={15} /></button>}>
      <div className="flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.05 }}
          className={`grid h-24 w-16 shrink-0 place-items-center ${frameCls(s.frame)}`}>
          <Hero equip={s.equip} look={s.look} size={80} />
        </motion.div>
        <div className="min-w-0">
          <div className="truncate font-rpg text-lg font-bold text-slate-100">{p.name}</div>
          {s.title && <div className="text-xs font-semibold text-violet-700">« {t.shop.items[s.title]} »</div>}
          <div className="text-xs text-slate-400">{t.sheet.rank}: <b className={stats.rank === 'free' ? 'text-emerald-700' : 'text-blue-700'}>{t.ranks[stats.rank]}</b> · {t.jobs[job].name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-yellow-800"><Sprite name="coin" size={16} /> {s.gold.toLocaleString()} {t.gold}</div>
        </div>
      </div>

      <div className="mt-3">
        <Bar value={stats.freedomPct} max={100} color="bg-emerald-600" className="h-2" />
        <div className="mt-0.5 text-[10px] text-slate-500">{t.sheet.freedom(stats.freedomPct.toFixed(1))}</div>
      </div>

      <label className="mt-3 block text-xs text-slate-300">
        <span className="mb-1 block">{t.sheet.jobGroup}</span>
        <span className="flex items-center gap-2">
          <Sprite name={JOBS[job].sprite} size={32} />
          <select className={`${inputCls} min-w-0 flex-1`} value={job} onChange={e => updateProfile({ job: e.target.value as Job })}>
            {JOB_KEYS.map(j => <option key={j} value={j}>{t.jobs[j].name} — {t.jobs[j].who}</option>)}
          </select>
        </span>
        <span className="mt-1 block text-[11px] text-emerald-700">{t.jobs[job].perk}</span>
      </label>

      <LookEditor game={game} />

      {game.moneyLinked && <p className="mt-1 text-[11px] text-emerald-700">{t.sheet.linked}</p>}

      {editing && <ProfileForm t={t} profile={p} onSave={v => { updateProfile(v); setEditing(false) }} />}

      {p.highInterestDebt && (
        <div className="mt-3 flex items-start gap-2 border border-red-500 bg-red-500/15 p-2 text-[11px] text-red-700">
          <AlertTriangle size={14} className="mt-px shrink-0" /> {t.sheet.debt}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-red-700"><Heart size={13} /> {t.sheet.hp}</span>
            <span className="shrink-0 text-slate-400">{t.sheet.months(stats.monthsCovered.toFixed(1), stats.hpMonths)}</span>
          </div>
          <Bar value={stats.hp} max={stats.hpMax} color="bg-red-600" />
          <div className="mt-1 text-[11px] text-slate-500">{thb(p.emergencyFund)} / {thb(stats.hpMax)}</div>
          {(hpCritical || hpLow) && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-2 flex items-start gap-2 border p-2 text-[11px] ${hpCritical ? 'animate-pulse border-red-500 bg-red-500/15 text-red-700' : 'border-amber-500/40 bg-amber-500/10 text-amber-800'}`}>
              <AlertTriangle size={14} className="mt-px shrink-0" />
              {hpCritical ? t.sheet.hpCritical : t.sheet.hpLow}
            </motion.div>
          )}
        </div>

        <div>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-blue-700"><Droplet size={13} /> {t.sheet.mp}</span>
            <span className="shrink-0 text-slate-400">{t.sheet.left(thb(stats.mp))}</span>
          </div>
          <Bar value={stats.mp} max={stats.mpMax} color="bg-blue-600" />
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <Attr icon={Dumbbell} label="STR" hint={t.sheet.strHint} value={stats.str} color="bg-amber-500" />
        <Attr icon={ShieldCheck} label="DEF" hint={t.sheet.defHint(Math.round(stats.diversification), p.insured, stats.overweight.length > 0)} value={stats.def} color="bg-emerald-500" />
        <Attr icon={Brain} label="INT" hint={t.sheet.intHint} value={stats.int} color="bg-violet-500" />
      </div>
    </Panel>
  )
}

function Attr({ icon: Icon, label, hint, value, color }: { icon: typeof Brain; label: string; hint: string; value: number; color: string }) {
  return (
    <div title={hint}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-slate-200"><Icon size={13} /> {label}</span>
        <span className="font-mono text-slate-300">{value}</span>
      </div>
      <Bar value={value} max={100} color={color} className="h-2" />
      <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div>
    </div>
  )
}

function ProfileForm({ t, profile, onSave }: { t: Dict; profile: Profile; onSave: (p: Profile) => void }) {
  const [f, setF] = useState(profile)
  const num = (k: keyof Profile) => ({
    type: 'number', min: 0, inputMode: 'numeric' as const, value: f[k] as number, className: inputCls,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Math.max(0, Number(e.target.value) || 0) }),
  })
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...f, name: f.name.trim() || t.sheet.defaultName }) }}
      className="sunken mt-4 space-y-2 p-3">
      <Field label={t.sheet.heroName}><input className={inputCls} value={f.name} maxLength={40} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t.sheet.income}><input {...num('monthlyIncome')} /></Field>
        <Field label={t.sheet.expense}><input {...num('monthlyExpense')} /></Field>
        <Field label={t.sheet.fund}><input {...num('emergencyFund')} /></Field>
        <Field label={t.sheet.budget}><input {...num('monthlyBudget')} /></Field>
      </div>
      <label className="flex items-center gap-2 py-1 text-xs text-slate-300">
        <input type="checkbox" checked={f.insured} onChange={e => setF({ ...f, insured: e.target.checked })} className="size-4 accent-emerald-600" />
        {t.sheet.insured}
      </label>
      <label className="flex items-center gap-2 py-1 text-xs text-slate-300">
        <input type="checkbox" checked={f.highInterestDebt} onChange={e => setF({ ...f, highInterestDebt: e.target.checked })} className="size-4 accent-red-600" />
        {t.sheet.hasDebt}
      </label>
      <button className="btn btn-primary w-full">{t.sheet.save}</button>
    </form>
  )
}

/** Free appearance: step through skin tones, hair styles, hair colors and beards. */
function LookEditor({ game }: { game: Game }) {
  const { s, t, setLook } = game
  const L = s.look
  const cycle = <T,>(list: readonly T[], v: T, d: number) => list[(list.indexOf(v) + d + list.length) % list.length]
  const swatch = (hex: string) => <span className="inline-block size-3 border border-black" style={{ background: hex }} />
  const rows = [
    { k: 'skin', label: swatch(SKINS[L.skin][0]), step: (d: number) => setLook({ skin: (L.skin + d + SKINS.length) % SKINS.length }) },
    { k: 'hair', label: t.shop.hairs[L.hair], step: (d: number) => setLook({ hair: cycle(HAIRS, L.hair as typeof HAIRS[number], d) }) },
    { k: 'hairColor', label: swatch(HAIR_COLORS[L.hairColor][0]), step: (d: number) => setLook({ hairColor: (L.hairColor + d + HAIR_COLORS.length) % HAIR_COLORS.length }) },
    { k: 'beard', label: t.shop.beards[L.beard], step: (d: number) => setLook({ beard: cycle(BEARDS, L.beard as typeof BEARDS[number], d) }) },
    { k: 'scene', label: t.shop.scenes[L.scene ?? 0], step: (d: number) => setLook({ scene: ((L.scene ?? 0) + d + SCENES.length) % SCENES.length }) },
  ]
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs text-slate-300">{t.shop.look}</div>
      <div className="mb-1.5 grid grid-cols-2 gap-1.5" role="radiogroup">
        {(['m', 'f'] as const).map(g => {
          const on = (L.gender ?? 'm') === g
          return (
            <button key={g} role="radio" aria-checked={on} onClick={() => setLook(g === 'f' ? { gender: g, beard: 'none' } : { gender: g })}
              className={`btn flex items-center justify-center gap-2 py-1.5 text-xs ${on ? 'btn-pressed font-bold text-emerald-700' : ''}`}>
              <Hero equip={{}} look={{ ...L, gender: g }} pose="still" size={40} /> {t.shop.gender[g]}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map(r => (
          <div key={r.k} className={`sunken flex items-center gap-1 px-1 py-0.5 text-[11px] ${r.k === 'scene' ? 'col-span-2' : ''}`}>
            <span className="w-14 shrink-0 text-slate-500">{t.shop.lookParts[r.k]}</span>
            <button className="btn !px-1.5 !py-0" onClick={() => r.step(-1)} aria-label="previous">‹</button>
            <span className="flex min-w-0 flex-1 justify-center truncate text-slate-100">{r.label}</span>
            <button className="btn !px-1.5 !py-0" onClick={() => r.step(1)} aria-label="next">›</button>
          </div>
        ))}
      </div>
    </div>
  )
}
