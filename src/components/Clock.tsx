import { useNow } from '../lib/useNow'
import type { Lang } from '../lib/i18n'
import { skyAt } from '../lib/calendar'
import { Sprite } from './Sprite'

/** Pixel clock for the top bar: time + short date (Buddhist year in Thai), sun or moon by the hour. */
export default function Clock({ lang }: { lang: Lang }) {
  const now = useNow()
  const time = now.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(lang === 'th' ? { year: '2-digit' } : {}) })
  const sky = skyAt(now.getHours())
  return (
    <div className="flex items-center gap-1.5 font-rpg leading-none text-retro-cream" title={now.toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB')}>
      <Sprite name={sky === 'night' ? 'moon' : 'sun'} size={16} />
      <span className="flex flex-col">
        <span className="text-sm tracking-wider">{time}</span>
        <span className="text-[10px] text-retro-mint max-sm:hidden">{date}</span>
      </span>
    </div>
  )
}
