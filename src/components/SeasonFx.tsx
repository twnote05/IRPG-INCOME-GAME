import type { Season } from '../lib/calendar'
import { Sprite } from './Sprite'

// Festival decorations laid over the hero's scene. Particles are plain squares moved by CSS in pixel steps.
const spots = (n: number, seed: number) => Array.from({ length: n }, (_, i) => {
  const r = Math.sin(seed * 97 + i * 13.37) * 43758.5453
  const f = r - Math.floor(r)
  return { left: (i * 100) / n + f * (100 / n), delay: -f * 4 - i * 0.37, dur: 2.4 + f * 2 }
})

export default function SeasonFx({ season }: { season: Season | null }) {
  if (!season) return null
  const fall = (color: string, size: number, speed = 1) => spots(18, size).map((p, i) => (
    <span key={i} aria-hidden className="absolute top-0 animate-fall" style={{
      left: `${p.left}%`, width: size, height: size * (color === '#4cc2ff' ? 2 : 1), background: color,
      animationDuration: `${p.dur / speed}s`, animationDelay: `${p.delay}s`,
    }} />
  ))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {season === 'christmas' && fall('#ffffff', 4, 0.6)}
      {season === 'songkran' && fall('#4cc2ff', 3, 1.6)}
      {season === 'newyear' && spots(6, 3).map((p, i) => (
        <span key={i} className="absolute" style={{ left: `${p.left}%`, top: `${8 + (i % 3) * 10}%`, animation: `twinkle ${p.dur / 2}s ${p.delay}s steps(3) infinite` }}>
          <Sprite name="sparkle" size={32} />
        </span>
      ))}
      {season === 'loykrathong' && <>
        {spots(5, 7).map((p, i) => (
          <span key={i} className="absolute animate-rise" style={{ left: `${p.left}%`, animationDuration: `${p.dur * 3}s`, animationDelay: `${p.delay * 2}s` }}>
            <Sprite name="khom" size={20} />
          </span>
        ))}
        <span className="absolute bottom-[4%] left-[8%]"><Sprite name="krathong" size={27} /></span>
        <span className="absolute right-[10%] bottom-[6%]"><Sprite name="krathong" size={27} /></span>
      </>}
      {season === 'cny' && [12, 30, 70, 88].map((x, i) => (
        <span key={x} className="absolute top-0 origin-top animate-sway" style={{ left: `${x}%`, animationDelay: `${-i * 0.4}s` }}>
          <Sprite name="lantern_red" size={36} />
        </span>
      ))}
    </div>
  )
}
