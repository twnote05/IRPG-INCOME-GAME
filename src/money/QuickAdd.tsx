import { useRef, useState } from 'react'
import { inputCls } from '../components/ui'
import type { Dict } from '../lib/i18n'
import type { Money } from './useMoney'

/** The everyday quick-add box. */
export default function QuickAdd({ money, t }: { money: Money; t: Dict }) {
  const [text, setText] = useState('')
  const [shake, setShake] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (money.addQuick(text)) setText('')
    else { setShake(true); setTimeout(() => setShake(false), 400); input.current?.focus() }
  }

  return (
    <>
      <form onSubmit={submit} className={`flex gap-2 ${shake ? 'animate-[shake_0.35s]' : ''}`}>
        <input ref={input} className={`${inputCls} min-w-0 flex-1`} value={text} onChange={e => setText(e.target.value)}
          placeholder={t.money.quickPh} aria-label={t.money.quickAria} autoComplete="off" enterKeyHint="done" />
        <button className="btn btn-primary shrink-0 px-4">{t.money.add}</button>
      </form>
      <input type="date" className={`${inputCls} mt-1.5 w-full`} value={money.entryDate}
        onChange={e => money.setEntryDate(e.target.value)} aria-label={t.money.entryDate} />
    </>
  )
}
