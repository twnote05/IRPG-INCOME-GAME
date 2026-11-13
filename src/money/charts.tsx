// Hand-drawn charts from โปรเจค 2, restyled for the retro theme. Every value carries a text label —
// meaning is never carried by color alone, and there's no hover on phones.
import type { ReactNode } from 'react'
import { pieData, type BudgetState } from './logic'
import { fmt0 } from './fmt'

const BAR: Record<BudgetState, string> = { ok: 'bg-blue-600', warn: 'bg-amber-500', over: 'bg-red-600' }
/** Pixel bevel for bar fills: lit top-left, shaded bottom-right. */
export const PX = 'shadow-[inset_2px_2px_0_#ffffff40,inset_-2px_-2px_0_#0a0c2440]'
const TXT: Record<BudgetState, string> = { ok: 'text-slate-100', warn: 'text-amber-800', over: 'text-red-700' }

export interface HRow { label: string; value: number; note?: string; st?: BudgetState }

export function BarsH({ rows, max, empty }: { rows: HRow[]; max?: number; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  const top = max ?? Math.max(...rows.map(r => r.value), 1)
  return (
    <div className="space-y-2.5">
      {rows.map(r => {
        const st = r.st ?? 'ok'
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-slate-300">{r.label}{r.note && <span className="text-slate-500"> {r.note}</span>}</span>
              <b className={`shrink-0 font-mono ${TXT[st]}`}>{fmt0(r.value)}</b>
            </div>
            <div className="track h-2.5 overflow-hidden">
              <div className={`h-full ${BAR[st]} ${PX}`} style={{ width: `${Math.min(100, Math.abs(r.value) / top * 100)}%`, minWidth: r.value ? 3 : 0 }} />
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
 * abbreviated (12.3k) so it fits a ~27px column. `onPick` makes each bar a full-height button
 * (name = label + value). `now` adds a triangle under the label, `dim` fades it, `sel` outlines it.
 */
export function BarsV({ rows, empty, onPick, nowText = '' }: { rows: VBar[]; empty: string; onPick?: (i: number) => void; nowText?: string }) {
  const top = Math.max(...rows.map(r => r.value), 0)
  if (!top) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  const show = rows.length > 8 ? compact : fmt0
  return (
    <div className="flex gap-0.5">
      {rows.map((r, i) => {
        const inner = (
          <>
            <span className="font-mono text-[10px] leading-4 text-slate-200">{r.value ? show(r.value) : '–'}</span>
            <span className="flex h-24 w-full items-end justify-center">
              <span className={`w-4/5 max-w-8 ${r.now ? 'bg-emerald-600' : 'bg-blue-600'} ${PX}`}
                style={{ height: `${r.value / top * 100}%`, minHeight: r.value ? 3 : 0 }} />
            </span>
            <span className={`text-[10px] leading-4 text-slate-300 ${r.now ? 'font-bold' : ''}`}>{r.label}</span>
            <span aria-hidden className="h-3 text-[8px] leading-3 text-emerald-700">{r.now ? '\u25B2' : ''}</span>
          </>
        )
        const cls = `flex min-w-0 flex-1 flex-col items-center ${r.dim ? 'opacity-60' : ''} ${r.sel ? 'outline outline-2 outline-offset-[-2px] outline-emerald-600' : ''}`
        const name = `${r.label} ${fmt0(r.value)}${r.now ? ` (${nowText})` : ''}`
        return onPick
          ? <button key={i} type="button" className={`${cls} min-h-11`} aria-label={name} aria-current={r.sel || undefined} onClick={() => onPick(i)}>{inner}</button>
          : <div key={i} className={cls} role="img" aria-label={name}>{inner}</div>
      })}
    </div>
  )
}

/** Donut drawn on a pixel grid: stepped edges, dark outline, outline-colored seams between slices. */
export function PixelRing({ slices, center, label, size = 'size-44' }: {
  slices: { label: string; value: number; color: string }[]; center?: ReactNode; label: string; size?: string
}) {
  const total = slices.reduce((t, x) => t + x.value, 0)
  const N = 36, C = N / 2, RO = 17.6, RI = 10.6, INK = '#0a0c24'
  const ends: number[] = []
  slices.reduce((at, x) => (ends.push(at + (x.value / total) * 100), at + (x.value / total) * 100), 0)
  const paths: Record<string, string> = {}
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.hypot(dx, dy)
    if (r > RO || r < RI) continue
    const pct = ((Math.atan2(dx, -dy) / (2 * Math.PI)) * 100 + 100) % 100 // clockwise from 12 o'clock
    const i = ends.findIndex(e => pct < e)
    const nearSeam = slices.length > 1 && [0, ...ends].some(e => Math.abs(pct - e) * (2 * Math.PI * r) / 100 < 0.75)
    const fill = r > RO - 1.1 || r < RI + 1.1 || nearSeam ? INK : slices[i === -1 ? slices.length - 1 : i].color
    paths[fill] = (paths[fill] ?? '') + `M${x} ${y}h1v1h-1z`
  }
  return (
    <div className={`relative shrink-0 ${size}`}>
      <svg viewBox={`0 0 ${N} ${N}`} className="pixel size-full" role="img" aria-label={label}>
        <title>{slices.map(x => `${x.label} ${fmt0(x.value)}`).join(' · ')}</title>
        {Object.entries(paths).map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
      </svg>
      {center && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  )
}

export function Donut({ rows, totalLabel, empty, otherLabel }: {
  rows: { label: string; value: number }[]; totalLabel: string; empty: string; otherLabel: (n: number) => string
}) {
  const { total, slices } = pieData(rows, otherLabel)
  if (!total) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <PixelRing label={totalLabel} slices={slices.map((r, i) => ({ label: r.label, value: r.value, color: `var(--s${i + 1})` }))}
        center={<div><div className="text-[10px] text-slate-500">{totalLabel}</div><div className="font-mono text-2xl text-slate-100">{fmt0(total)}</div></div>} />
      <div className="w-full divide-y divide-slate-800">
        {slices.map((r, i) => (
          <div key={r.label} className="flex items-center gap-2 py-1.5 text-sm">
            <span className="size-3 shrink-0 border border-[#0a0c24]" style={{ background: `var(--s${i + 1})` }} />
            <span className="min-w-0 flex-1 truncate text-slate-200">{r.label}</span>
            <span className="w-10 text-right text-xs text-slate-500">{r.pct.toFixed(0)}%</span>
            <span className="font-mono font-bold text-slate-100">{fmt0(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
