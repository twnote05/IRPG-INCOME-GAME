import { useEffect, useState } from 'react'
import { evalAmount } from './logic'

/** Number field that accepts arithmetic ("100*30"). Keeps the typed text; commits only valid values. */
export default function AmountInput({ value, onCommit, className = '', placeholder, ariaLabel, scale = 1, integer = false }: {
  value: number | undefined; onCommit: (v: number | undefined) => void; className?: string; placeholder?: string
  ariaLabel?: string; scale?: number; integer?: boolean // scale: shown = value × scale (100 for percentages)
}) {
  const shown = (v: number | undefined) => (v ? String(Math.round(v * scale * 1000) / 1000) : '')
  const [text, setText] = useState(shown(value))
  const [bad, setBad] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setText(shown(value)) }, [value, focused]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      className={`field w-full text-right font-mono sm:text-sm ${bad ? '!outline-2 !outline-red-600' : ''} ${className}`}
      inputMode="decimal" value={text} placeholder={placeholder} aria-label={ariaLabel} aria-invalid={bad}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setBad(false) }}
      onChange={e => {
        setText(e.target.value)
        if (e.target.value.trim() === '') { setBad(false); return onCommit(undefined) }
        const v = evalAmount(e.target.value)
        setBad(Number.isNaN(v))
        if (!Number.isNaN(v)) onCommit(integer ? Math.max(0, Math.round(v)) : v / scale)
      }}
    />
  )
}
