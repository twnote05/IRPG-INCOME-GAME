// Hand-drawn charts. Every value carries a text label — meaning is never carried by color alone,
// and there's no hover on phones.
import type { ReactNode } from 'react'
import { pieData, type BudgetState } from './logic'
import { fmt0 } from './fmt'

const BAR: Record<BudgetState, string> = { ok: 'bg-accent', warn: 'bg-warn', over: 'bg-neg' }
const TXT: Record<BudgetState, string> = { ok: 'text-ink', warn: 'text-warn', over: 'text-neg' }

export interface HRow { label: string; value: number; note?: string; st?: BudgetState }

export function BarsH({ rows, max, empty }: { rows: HRow[]; max?: number; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  const top = max ?? Math.max(...rows.map(r => r.value), 1)
  return (
    <div className="space-y-2.5">
      {rows.map(r => {
        const st = r.st ?? 'ok'
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate">{r.label}{r.note && <span className="text-muted"> {r.note}</span>}</span>
              <b className={`shrink-0 font-mono ${TXT[st]}`}>{fmt0(r.value)}</b>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className={`h-full rounded-full ${BAR[st]}`} style={{ width: `${Math.min(100, Math.abs(r.value) / top * 100)}%`, minWidth: r.value ? 3 : 0 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface VBar { label: string; value: number; now?: boolean; dim?: boolean; sel?: boolean }
const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : fmt0(n))

/**
 * Vertical bars for 7 days and 12 months. Every bar prints its value; with 8+ bars the value is
 * abbreviated (13k, 3.3k) so it fits a ~27px column. `onPick` makes each bar a full-height button
 * (name = label + value). `now` adds a triangle under the label, `dim` draws it as a dashed outline, `sel` outlines it.
 * A zero bar draws nothing at all — a 2px dashed outline with no height is a stub, not a value.
 */
export function BarsV({ rows, empty, onPick, nowText = '' }: { rows: VBar[]; empty: string; onPick?: (i: number) => void; nowText?: string }) {
  const top = Math.max(...rows.map(r => r.value), 0)
  if (!top) return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  const show = rows.length > 8 ? compact : fmt0
  return (
    <div className="flex gap-0.5">
      {rows.map((r, i) => {
        const inner = (
          <>
            <span className="font-mono text-[10px] leading-4 text-muted">{r.value ? show(r.value) : '–'}</span>
            <span className="flex h-24 w-full items-end justify-center">
              {r.value > 0 && (
                <span className={`w-4/5 max-w-8 rounded-t-sm ${r.dim ? 'border-2 border-dashed border-accent' : r.now ? 'bg-pos' : 'bg-accent'}`}
                  style={{ height: `${r.value / top * 100}%`, minHeight: 3 }} />
              )}
            </span>
            <span className={`text-[10px] leading-4 ${r.now ? 'font-bold' : 'text-muted'}`}>{r.label}</span>
            <span aria-hidden className="h-3 text-[8px] leading-3 text-pos">{r.now ? '▲' : ''}</span>
          </>
        )
        const cls = `flex min-w-0 flex-1 flex-col items-center rounded-md ${r.sel ? 'outline outline-2 outline-offset-[-2px] outline-pos' : ''}`
        const name = `${r.label} ${fmt0(r.value)}${r.now ? ` (${nowText})` : ''}`
        return onPick
          ? <button key={i} type="button" className={`${cls} min-h-11`} aria-label={name} aria-current={r.sel || undefined} onClick={() => onPick(i)}>{inner}</button>
          : <div key={i} className={cls} role="img" aria-label={name}>{inner}</div>
      })}
    </div>
  )
}

/**
 * Donut: one stroked arc per slice, `pathLength="100"` so a slice's dash length IS its percentage.
 * Without it the browser measures the circle itself (Chrome: 99.35, not the 100 that r=15.915
 * suggests), every arc comes out ~0.65% long and the error piles up slice by slice.
 */
function Ring({ slices, center, label }: {
  slices: { label: string; value: number; color: string }[]; center?: ReactNode; label: string
}) {
  const total = slices.reduce((t, x) => t + x.value, 0)
  let at = 0
  return (
    <div className="relative size-40 shrink-0">
      {/* the ring's outer edge sits at r + strokeWidth/2 = 18.415, so 0 0 36 36 would shave it flat at 12/3/6/9 */}
      <svg viewBox="-1 -1 38 38" className="size-full -rotate-90" role="img" aria-label={label}>
        <title>{slices.map(x => `${x.label} ${fmt0(x.value)}`).join(' · ')}</title>
        {slices.map(s => {
          const pct = (s.value / total) * 100
          // a hairline seam so touching slices stay apart, but never more than a quarter of the
          // slice itself — a flat 0.7 off a 2% slice draws it a third smaller than it is
          const gap = slices.length > 1 ? Math.min(0.7, pct / 4) : 0
          const el = (
            <circle key={s.label} cx="18" cy="18" r="15.915" pathLength="100" fill="none" stroke={s.color} strokeWidth="5"
              strokeDasharray={`${pct - gap} ${100 - (pct - gap)}`} strokeDashoffset={-at} />
          )
          at += pct
          return el
        })}
      </svg>
      {center && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  )
}

export function Donut({ rows, totalLabel, empty, otherLabel }: {
  rows: { label: string; value: number }[]; totalLabel: string; empty: string; otherLabel: (n: number) => string
}) {
  const { total, slices } = pieData(rows, otherLabel)
  if (!total) return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <Ring label={totalLabel} slices={slices.map((r, i) => ({ label: r.label, value: r.value, color: `var(--s${i + 1})` }))}
        center={<div><div className="text-[10px] text-muted">{totalLabel}</div><div className="font-mono text-2xl font-bold">{fmt0(total)}</div></div>} />
      <div className="w-full divide-y divide-line">
        {slices.map((r, i) => (
          <div key={r.label} className="flex items-center gap-2 py-1.5 text-sm">
            <span className="size-3 shrink-0 rounded-sm border border-line" style={{ background: `var(--s${i + 1})` }} />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="w-10 text-right text-xs text-muted">{r.pct.toFixed(0)}%</span>
            <span className="font-mono font-bold">{fmt0(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
