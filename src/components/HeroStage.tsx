import type { ReactNode } from 'react'
import { SCENES } from '../lib/game'
import { SKY, seasonOn, skyAt } from '../lib/calendar'
import { previewSeason, useNow } from '../lib/useNow'
import SeasonFx from './SeasonFx'
import type { GameState } from '../types'
import type { Pose } from '../lib/sprites'
import { Hero, Scene } from './Sprite'

/**
 * The hero standing in a pixel landscape (castle / forest / mountains, picked in the look editor).
 * 16:9 so the ground line sits at the same height at every width; the hero scales with the stage.
 */
export default function HeroStage({ s, pose = 'idle', className = '', children }: { s: GameState; pose?: Pose; className?: string; children?: ReactNode }) {
  const walking = pose === 'walk'
  const now = useNow()
  const season = previewSeason ?? seasonOn(now.toLocaleDateString('sv-SE'))
  return (
    <div className={`relative aspect-video overflow-hidden bg-[#0f1235] ${className}`}>
      <Scene name={SCENES[s.look.scene ?? 0] ?? SCENES[0]} recolor={SKY[skyAt(now.getHours())]} className="absolute inset-0 size-full" />
      <SeasonFx season={season} />
      {/* the ground in every scene starts at row 43 of 54 → feet at ~20% from the bottom */}
      <div className={`absolute inset-x-0 bottom-[16%] flex h-[66%] justify-center ${walking ? 'animate-walkout' : ''}`}>
        <span aria-hidden className="absolute bottom-[1%] left-1/2 h-[4%] w-[14%] -translate-x-1/2 bg-black/40" />
        <Hero equip={s.equip} look={s.look} pose={pose} size={200} className="relative h-full w-auto" />
      </div>
      {children}
    </div>
  )
}
