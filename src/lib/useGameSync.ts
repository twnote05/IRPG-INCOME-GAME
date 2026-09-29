import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '../types'
import { api, type GasConfig } from '../money/useMoney'
import { parseState } from './storage'

// The investing side rides on the same sheet as the money side (gas/Code.gs: gameLoad / gameSave).
// Same safety rule as money: a device must pull before it may push, so a fresh phone can't wipe the sheet.
const META = 'investor-rpg:v1.sync' // { url, savedAt } of the sheet copy this device last pulled or pushed
const DIRTY = 'investor-rpg:v1.dirty' // local edits not yet on the sheet
export const BACKUP = 'investor-rpg:v1.backup' // this device's state from before its first pull replaced it

export type GameSync = { state: 'local' | 'syncing' | 'ok' | 'error' | 'old'; at?: number; error?: string }

const read = <T,>(k: string, fb: T): T => { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v) } catch { return fb } }
const write = (k: string, v: unknown) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage blocked */ } }

export function useGameSync(s: GameState, setS: (s: GameState) => void, gas: GasConfig | null) {
  const [sync, setSync] = useState<GameSync>({ state: gas ? 'syncing' : 'local' })
  const sRef = useRef(s)
  sRef.current = s
  const gasRef = useRef(gas)
  gasRef.current = gas
  const fromSheet = useRef(true) // the next state change is a load, not the player (starts true: initial mount)
  const timer = useRef<number | undefined>(undefined)
  const meta = () => read(META, { url: '', savedAt: '' })
  const pulledHere = (cfg: GasConfig) => meta().url === cfg.url
  const fail = (e: unknown) => {
    const msg = (e as Error).message
    // the sheet's Apps Script predates game sync: keep working locally, tell the player how to update it
    setSync(/unknown action/.test(msg) ? { state: 'old' } : { state: 'error', error: msg })
  }

  const push = useCallback(async () => {
    const cfg = gasRef.current
    if (!cfg || !pulledHere(cfg)) return
    setSync(x => ({ ...x, state: 'syncing' }))
    try {
      const r = await api<{ savedAt: string }>(cfg, 'gameSave', { state: JSON.stringify(sRef.current) })
      write(META, { url: cfg.url, savedAt: r.savedAt })
      write(DIRTY, null)
      setSync({ state: 'ok', at: Date.now() })
    } catch (e) { fail(e) }
  }, [])

  const pull = useCallback(async () => {
    const cfg = gasRef.current
    if (!cfg) return setSync({ state: 'local' })
    const m = meta(), first = m.url !== cfg.url
    if (!first && read(DIRTY, null)) return push() // unsent edits go up first, or pulling would overwrite them
    setSync(x => ({ ...x, state: 'syncing' }))
    try {
      const r = await api<{ state: string; savedAt: string }>(cfg, 'gameLoad')
      const remote = r.state ? parseState(r.state) : null
      if (!remote) { // nothing on the sheet yet: this device's game becomes the first copy
        write(META, { url: cfg.url, savedAt: '' })
        return push()
      }
      if (first || r.savedAt !== m.savedAt) {
        if (first) write(BACKUP, sRef.current) // the sheet wins on first connect; keep ours for "undo"
        fromSheet.current = true
        setS(remote)
      }
      write(META, { url: cfg.url, savedAt: r.savedAt })
      write(DIRTY, null)
      setSync({ state: 'ok', at: Date.now() })
    } catch (e) { fail(e) }
  }, [push, setS])

  // pull on open / when the connection changes / when the app comes back; flush edits when it's hidden
  useEffect(() => {
    pull()
    const onVis = () => {
      if (document.visibilityState === 'visible') return pull()
      if (read(DIRTY, null)) { clearTimeout(timer.current); push() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [gas?.url, gas?.token, pull, push])

  // every change the player makes is saved up a few seconds later (batches bursts like live price ticks)
  useEffect(() => {
    if (fromSheet.current) { fromSheet.current = false; return }
    write(DIRTY, 1)
    const cfg = gasRef.current
    if (!cfg || !pulledHere(cfg)) return
    clearTimeout(timer.current)
    timer.current = window.setTimeout(push, 3000)
  }, [s, push])

  return { sync, syncNow: pull }
}
