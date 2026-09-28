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

export interface VRow { label: string; value: number; now?: boolean; planOnly?: boolean }

/** Vertical bars. With many bars (31 days / 12 months) only the tallest and the current one get a number. */
export function BarsV({ rows, empty }: { rows: VRow[]; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  const top = Math.max(...rows.map(r => r.value), 1)
  const dense = rows.length > 8
  return (
    <div>
      <div className={`flex h-36 items-end pt-5 ${dense ? 'gap-0.5' : 'gap-1.5'}`}>
        {rows.map((r, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[9px] whitespace-nowrap text-slate-500">{r.value && (!dense || r.value === top || r.now) ? fmt0(r.value) : ''}</span>
            {r.value ? (
              <i className={`block w-full border border-[#0a0c24] ${r.planOnly ? 'bg-[repeating-linear-gradient(135deg,var(--color-blue-600)_0_3px,transparent_3px_6px)]' : `bg-blue-600 ${PX}`} ${r.now ? 'outline-2 outline-offset-1 outline-amber-500' : ''}`}
                style={{ height: `${Math.max(4, r.value / top * 100)}%` }} />
            ) : <i className="block w-full border-t-2 border-dashed border-slate-700" />}
          </div>
        ))}
      </div>
      <div className={`mt-1 flex ${dense ? 'gap-0.5' : 'gap-1.5'}`}>
        {rows.map((r, i) => <div key={i} className="min-w-0 flex-1 text-center text-[10px] whitespace-nowrap text-slate-500">{r.label}</div>)}
      </div>
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
