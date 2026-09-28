import { useCallback, useEffect, useRef, useState } from 'react'
import type { Pose } from './sprites'

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** A pose that overrides the resting one for `ms`, e.g. a hit or a sword swing. */
export function usePoseFlash() {
  const [flash, setFlash] = useState<Pose | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const play = useCallback((p: Pose, ms: number) => {
    if (reducedMotion()) return
    clearTimeout(timer.current)
    setFlash(p)
    timer.current = window.setTimeout(() => setFlash(null), ms)
  }, [])
  return [flash, play] as const
}
