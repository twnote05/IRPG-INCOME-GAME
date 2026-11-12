import { useRef, useState } from 'react'
import { inputCls } from '../components/ui'
import type { Dict } from '../lib/i18n'
import type { Money } from './useMoney'

/** The everyday quick-add box. */
export default function QuickAdd({ money, t, onToday = false }: { money: Money; t: Dict; onToday?: boolean }) {
  const [text, setText] = useState('')
  const [shake, setShake] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (money.addQuick(text, onToday)) setText('')
    else { setShake(true); setTimeout(() => setShake(false), 400); input.current?.focus() }
  }

  return (
    <>
      <form onSubmit={submit} className={`bevel flex gap-2 bg-slate-900 p-2 ${shake ? 'animate-[shake_0.35s]' : ''}`}>
        <input ref={input} className={`${inputCls} min-w-0 flex-1`} value={text} onChange={e => setText(e.target.value)}
          placeholder={t.money.quickPh} aria-label={t.money.quickAria} autoComplete="off" enterKeyHint="done" />
        <button className="btn btn-primary min-h-11 shrink-0 px-4 font-bold">{t.money.add}</button>
      </form>
      <p className="mt-1.5 px-1 text-[11px] text-slate-500">{t.money.hint}</p>
    </>
  )
}
