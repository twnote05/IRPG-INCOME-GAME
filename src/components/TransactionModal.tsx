import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Asset, Category, Horizon, LiveSource, Realm } from '../types'
import { CATEGORIES, HORIZONS, PLATFORMS, REALM_KEYS, localDate } from '../lib/game'
import type { Dict } from '../lib/i18n'
import { Field, TitleBar, inputCls } from './ui'

type Draft = Omit<Asset, 'id'> & { id?: string }
const LIVE_SOURCES: LiveSource[] = ['set', 'us', 'fund', 'crypto', 'gold']
const blank = (): Draft => ({ name: '', symbol: '', realm: 'domestic', category: 'Index ETF', invested: 0, currentValue: 0, purchaseDate: localDate() })

export default function TransactionModal({ t, initial, onSave, onClose }: { t: Dict; initial?: Asset; onSave: (a: Draft) => void; onClose: () => void }) {
  const [f, setF] = useState<Draft>(initial ?? blank())
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = f.name.trim(), symbol = f.symbol.trim().toUpperCase()
    if (!name || !symbol) return setError(t.modal.errRequired)
    if (!(f.invested > 0)) return setError(t.modal.errInvested)
    if (f.currentValue < 0) return setError(t.modal.errNegative)
    if (f.live && !(Number(f.units) > 0)) return setError(t.modal.errUnits)
    onSave({ ...f, name, symbol, currentValue: f.currentValue || f.invested, units: f.live ? Number(f.units) : undefined, platform: f.platform?.trim() || undefined })
    onClose()
  }

  const num = (k: 'invested' | 'currentValue') => ({
    type: 'number', min: 0, step: 'any', inputMode: 'decimal' as const, className: inputCls, value: f[k] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) }),
  })

  return (
    <motion.div className="fixed inset-0 z-40 grid place-items-end bg-black/50 sm:place-items-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      {/* bottom sheet on phones, centered window from sm up */}
      <motion.form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="tx-title"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        className="bevel flex max-h-[92dvh] w-full flex-col bg-slate-900 sm:max-w-lg">
        <TitleBar id="tx-title" title={initial ? t.modal.editTitle : t.modal.newTitle}
          action={<button type="button" onClick={onClose} className="btn px-1.5 py-0.5" aria-label={t.modal.close}><X size={14} /></button>} />
        <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label={t.modal.name}><input autoFocus className={inputCls} maxLength={60} placeholder="SET50 Index Fund" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={t.modal.symbol}><input className={`${inputCls} uppercase`} maxLength={12} placeholder="SET50" autoCapitalize="characters" value={f.symbol} onChange={e => setF({ ...f, symbol: e.target.value })} /></Field>
            <Field label={t.modal.realm}>
              <select className={inputCls} value={f.realm} onChange={e => setF({ ...f, realm: e.target.value as Realm })}>
                {REALM_KEYS.map(r => <option key={r} value={r}>{t.realms[r].name}</option>)}
              </select>
            </Field>
            <Field label={t.modal.category}>
              <select className={inputCls} value={f.category} onChange={e => setF({ ...f, category: e.target.value as Category })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t.categories[c]}</option>)}
              </select>
            </Field>
            <Field label={t.modal.invested}><input {...num('invested')} /></Field>
            <Field label={t.modal.current}><input {...num('currentValue')} placeholder={t.modal.eqInvested} /></Field>
            <Field label={t.modal.date}><input type="date" className={inputCls} value={f.purchaseDate} max={localDate()} onChange={e => setF({ ...f, purchaseDate: e.target.value })} /></Field>
            <Field label={t.modal.horizon}>
              <select className={inputCls} value={f.horizon ?? ''} onChange={e => setF({ ...f, horizon: (e.target.value || undefined) as Horizon | undefined })}>
                <option value="">{t.modal.horizonNone}</option>
                {HORIZONS.map(h => <option key={h} value={h}>{t.horizons[h].name} — {t.horizons[h].hint}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t.modal.platform}>
                <input className={inputCls} list="platforms" value={f.platform ?? ''} placeholder={t.modal.platformPh} maxLength={40}
                  onChange={e => setF({ ...f, platform: e.target.value })} />
                <datalist id="platforms">{PLATFORMS.map(p => <option key={p} value={p} />)}</datalist>
              </Field>
            </div>
          </div>

          <div className="sunken mt-3 grid gap-3 p-3 sm:grid-cols-[1fr_140px]">
            <Field label={t.modal.live}>
              <select className={inputCls} value={f.live ?? ''} onChange={e => setF({ ...f, live: (e.target.value || undefined) as LiveSource | undefined })}>
                <option value="">{t.modal.liveNone}</option>
                {LIVE_SOURCES.map(k => <option key={k} value={k}>{t.modal.sources[k]}</option>)}
              </select>
            </Field>
            {f.live && (
              <Field label={t.modal.units[f.live]}>
                <input type="number" min={0} step="any" inputMode="decimal" className={inputCls} value={f.units ?? ''}
                  onChange={e => setF({ ...f, units: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </Field>
            )}
            {f.live && t.modal.quoteId[f.live] && (
              <div className="sm:col-span-2">
                <Field label={t.modal.quoteId[f.live]!}>
                  <input className={inputCls} autoCapitalize="none" value={f.quoteId ?? ''} placeholder={f.live === 'crypto' ? 'bitcoin' : 'M0234_2537'}
                    onChange={e => setF({ ...f, quoteId: e.target.value || undefined })} />
                </Field>
              </div>
            )}
            {f.live && <p className="text-[11px] text-slate-500 sm:col-span-2">{t.modal.hints[f.live]} {t.modal.needServer}</p>}
          </div>

          {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn min-h-11 max-sm:flex-1">{t.modal.cancel}</button>
            <button className="btn btn-primary min-h-11 max-sm:flex-1">{initial ? t.modal.saveChanges : t.modal.add}</button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  )
}
