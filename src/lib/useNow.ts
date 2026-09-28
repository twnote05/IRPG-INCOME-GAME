import { useEffect, useState } from 'react'
import type { Season } from './calendar'

// Preview helpers: ?hour=13 shows that time of day, ?season=songkran shows a festival's decorations.
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
const previewHour = params.has('hour') ? Number(params.get('hour')) : null
export const previewSeason = (params.get('season') as Season | null) || null

/** Current time, refreshed each minute (and on return to the tab); idle while the tab is hidden. */
export function useNow() {
  const read = () => {
    const d = new Date()
    if (previewHour !== null && Number.isFinite(previewHour)) d.setHours(previewHour)
    return d
  }
  const [now, setNow] = useState(read)
  useEffect(() => {
    let timer: number | undefined
    const tick = () => {
      setNow(read())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000)) // land on the minute
    }
    const onVis = () => { clearTimeout(timer); if (document.visibilityState === 'visible') tick() }
    tick()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return now
}
