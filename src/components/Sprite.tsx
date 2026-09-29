import { memo, useEffect, useRef, useState } from 'react'
import { ANIMS, PALETTE, POSES, SPRITES, poseRows, spritePaths, type Anim, type Frame, type Pose, type SpriteName } from '../lib/sprites'
import { HELD_SPRITES, heroLayers, heroPalette } from '../lib/game'
import type { GameState, Look } from '../types'

const cache = new Map<string, Record<string, string>>()

/** Pixel sprite as crisp SVG. Use sizes that are multiples of 16 so every pixel is the same width. */
export const Sprite = memo(function Sprite({ name, size = 16, className = '', title }: {
  name: SpriteName; size?: number; className?: string; title?: string
}) {
  return <Layers names={[name]} size={size} className={className} title={title} />
})

const pathsOf = (name: SpriteName, recolor?: Record<string, string>, frame?: Frame) => {
  const key = name + (recolor ? JSON.stringify(recolor) : '') + (frame ? JSON.stringify(frame) : '')
  let paths = cache.get(key)
  if (!paths) {
    const rows = frame ? poseRows(SPRITES[name], frame, HELD_SPRITES.has(name), name === 'hero' || name === 'hero_f') : SPRITES[name]
    cache.set(key, (paths = spritePaths(rows, recolor ? { ...PALETTE, ...recolor } : PALETTE)))
  }
  return paths
}

/**
 * A sprite playing a looped frame animation (coin spin, flame flicker, slime squish, bird flap).
 * Same trick as <Hero>: frames are stacked and CSS shows one at a time; reduced motion keeps frame 0.
 */
export const AnimSprite = memo(function AnimSprite({ name, anim, size = 16, className = '', play = true }: {
  name: SpriteName; anim: Anim; size?: number; className?: string; play?: boolean
}) {
  const key = name + ':' + anim
  let built = animCache.get(key)
  if (!built) animCache.set(key, (built = (({ frames, dur }) => ({ dur, paths: frames.map(f => spritePaths(f)) }))(ANIMS[anim](name))))
  const { paths, dur } = built
  const rows = SPRITES[anim === 'flap' ? 'bird' : name], n = paths.length
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} width={(size * rows[0].length) / rows.length} height={size} className={`pixel inline-block shrink-0 ${className}`} aria-hidden>
      {paths.map((p, i) => (
        <g key={i} className={play ? 'animate-frames' : ''} style={play ? { opacity: i ? 0 : 1, animation: `show${n} ${dur}s linear infinite`, animationDelay: `${-((n - i) * dur) / n}s` } : { opacity: i ? 0 : 1 }}>
          {Object.entries(p).map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
        </g>
      ))}
    </svg>
  )
})
const animCache = new Map<string, { dur: number; paths: Record<string, string>[] }>()

/** Gold with a little payoff: the coin spins and "+N" floats up whenever the amount grows. */
export function Gold({ gold, size = 16, className = '' }: { gold: number; size?: number; className?: string }) {
  const prev = useRef(gold)
  const [gain, setGain] = useState<{ n: number; id: number } | null>(null)
  useEffect(() => {
    if (gold > prev.current) setGain({ n: gold - prev.current, id: Date.now() })
    prev.current = gold
  }, [gold])
  useEffect(() => { if (!gain) return; const id = setTimeout(() => setGain(null), 1600); return () => clearTimeout(id) }, [gain])
  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      <AnimSprite name="coin" anim="spin" size={size} play={!!gain} />
      {gold.toLocaleString()}
      {gain && <span key={gain.id} aria-hidden className="pointer-events-none absolute -top-3 right-0 animate-floatup font-mono text-xs text-amber-500 [text-shadow:1px_1px_0_#0a0c24]">+{gain.n.toLocaleString()}</span>}
    </span>
  )
}

/** A backdrop that fills its box, anchored to the bottom (the ground). */
export function Scene({ name, recolor, className = '' }: { name: SpriteName; recolor?: Record<string, string>; className?: string }) {
  const rows = SPRITES[name]
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} preserveAspectRatio="xMidYMax slice" className={`pixel ${className}`} aria-hidden>
      {Object.entries(pathsOf(name, recolor)).map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
    </svg>
  )
}

/**
 * The player's hero: blank-slate human with their look and gear, playing a pose.
 * Frames are stacked <g>s; a CSS keyframe shows one at a time (no React re-render per frame), and with
 * reduced motion only the first frame shows. `size` = height (24×40 sprite; multiples of 40).
 */
export function Hero({ equip, look, pose = 'idle', size = 80, className = '' }: {
  equip: GameState['equip']; look?: Look; pose?: Pose; size?: number; className?: string
}) {
  const names = heroLayers(equip, look), recolor = heroPalette(look)
  const { frames, dur } = POSES[pose]
  const n = frames.length
  return (
    <svg viewBox="0 0 24 40" width={size * 0.6} height={size} className={`pixel inline-block shrink-0 ${pose === 'hurt' ? 'animate-hurt' : ''} ${className}`} aria-hidden>
      {frames.map((f, i) => (
        <g key={i} className={n > 1 ? 'animate-frames' : ''}
          style={n > 1 ? { opacity: i ? 0 : 1, animation: `show${n} ${dur}s linear infinite`, animationDelay: `${-((n - i) * dur) / n}s` } : undefined}>
          {names.map(nm => Object.entries(pathsOf(nm, recolor, f)).map(([fill, d]) => <path key={nm + fill} d={d} fill={fill} />))}
        </g>
      ))}
    </svg>
  )
}

function Layers({ names, size, className, title, recolor }: { names: SpriteName[]; size: number; className: string; title?: string; recolor?: Record<string, string> }) {
  const rows = SPRITES[names[0]]
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} width={size * rows[0].length / rows.length} height={size} className={`pixel inline-block shrink-0 ${className}`}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {names.map(n => Object.entries(pathsOf(n, recolor)).map(([fill, d]) => <path key={n + fill} d={d} fill={fill} />))}
    </svg>
  )
}
