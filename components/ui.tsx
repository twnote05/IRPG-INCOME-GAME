import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// Title-bar color per window
const TITLE_BG = {
  gold: 'bg-retro-teal',
  mana: 'bg-retro-blue',
  emerald: 'bg-retro-green',
  ruby: 'bg-retro-ruby',
}
export type Glow = keyof typeof TITLE_BG

/** Decorative minimize / maximize / close boxes. */
export function WinControls() {
  return (
    <span aria-hidden className="flex gap-0.5">
      {['_', '□', '×'].map(c => (
        <span key={c} className="grid size-4 place-items-center border border-t-[var(--hi)] border-l-[var(--hi)] border-r-[var(--lo)] border-b-[var(--lo)] bg-[var(--face)] text-[10px] leading-none text-[var(--ink)]">{c}</span>
      ))}
    </span>
  )
}

export function TitleBar({ title, icon: Icon, color = 'bg-retro-blue', action, id }: {
  title: string; icon?: LucideIcon; color?: string; action?: ReactNode; id?: string
}) {
  return (
    <header className={`flex items-center justify-between gap-2 px-2 py-1 text-white ${color}`}>
      <h2 id={id} className="flex min-w-0 items-center gap-1.5 font-rpg text-sm tracking-wide uppercase">
        {Icon && <Icon size={14} className="shrink-0" />} <span className="truncate">{title}</span>
      </h2>
      <div className="flex shrink-0 items-center gap-1.5">{action}<span className="max-sm:hidden"><WinControls /></span></div>
    </header>
  )
}

export function Panel({ title, icon, glow = 'gold', action, className = '', children }: {
  title: string; icon: LucideIcon; glow?: Glow; action?: ReactNode; className?: string; children: ReactNode
}) {
  return (
    <section className={`bevel bg-slate-900 ${className}`}>
      <TitleBar title={title} icon={icon} color={TITLE_BG[glow]} action={action} />
      <div className="p-3">{children}</div>
    </section>
  )
}

export function Bar({ value, max, color, className = 'h-3' }: { value: number; max: number; color: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`track relative w-full overflow-hidden ${className}`}
      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={`segmented relative h-full ${color}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
    </div>
  )
}

export const inputCls = 'field w-full sm:text-sm'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-slate-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}
