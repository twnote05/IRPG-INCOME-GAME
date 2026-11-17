import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** A card: quiet heading row (icon, title, optional action) over the body. */
export function Panel({ title, icon: Icon, action, className = '', children }: {
  title: string; icon: LucideIcon; action?: ReactNode; className?: string; children: ReactNode
}) {
  return (
    <section className={`rounded-xl border border-line bg-card ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-muted">
          <Icon size={14} className="shrink-0" /> <span className="truncate">{title}</span>
        </h2>
        {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

export function Bar({ value, max, color, className = 'h-3' }: { value: number; max: number; color: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`w-full overflow-hidden rounded-full bg-line ${className}`}
      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const inputCls = 'field w-full sm:text-sm'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}
