import { useEffect, useState } from 'react'
import type { Quote } from './game'

// The price server in server/ (keeps Settrade credentials out of the browser).
const SERVER = import.meta.env.VITE_PRICE_SERVER ?? 'http://localhost:8787'

export type LiveStatus = 'off' | 'connecting' | 'live' | 'offline'

/** Subscribes to live prices for the given symbols over SSE. EventSource reconnects on its own. */
export function useLivePrices(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [status, setStatus] = useState<LiveStatus>('off')
  const [server, setServer] = useState<Record<string, string>>({})
  const key = [...new Set(symbols)].sort().join(',')

  useEffect(() => {
    if (!key) { setStatus('off'); return }
    setStatus('connecting')
    const es = new EventSource(`${SERVER}/stream?symbols=${encodeURIComponent(key)}`)
    es.onopen = () => setStatus('live')
    es.onerror = () => setStatus('offline')
    es.onmessage = e => {
      const msg = JSON.parse(e.data) as { prices: Quote[]; status: Record<string, string> }
      setServer(msg.status)
      if (msg.prices.length) setQuotes(q => ({ ...q, ...Object.fromEntries(msg.prices.map(p => [p.symbol, p])) }))
    }
    return () => es.close()
  }, [key])

  return { quotes, status, server }
}
