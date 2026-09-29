import { Store } from 'lucide-react'
import { GEAR_SLOTS, SHOP, frameCls, type ShopItem } from '../lib/game'
import type { Game } from '../lib/useGame'
import { Gold, Hero, Sprite } from './Sprite'
import { Panel } from './ui'

/** Gold → gear, titles and frames. Legendary gear is unlocked by badges instead of bought. */
export default function Shop({ game }: { game: Game }) {
  const { s, t } = game
  const badge = (id: string) => t.adv.ach[id.replace('ach:', '')]?.[0] ?? id

  const Item = ({ it, preview }: { it: ShopItem; preview?: React.ReactNode }) => {
    const own = s.owned.includes(it.id)
    const worn = it.kind === 'gear' ? s.equip[it.slot!] === it.id : s[it.kind] === it.id
    const locked = !own && !!it.unlock && !s.claimed[it.unlock]
    const label = worn ? (it.kind === 'gear' ? t.shop.remove : t.shop.worn) : own ? t.shop.wear : it.unlock ? t.shop.claim : t.shop.buy
    return (
      <li className={`sunken flex items-center gap-2 p-2 ${locked ? 'opacity-60' : ''}`}>
        {preview}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-100">{t.shop.items[it.id]}</div>
          {!own && (it.unlock
            ? <div className="flex items-center gap-1 text-[10px] text-violet-700"><Sprite name={locked ? 'lock' : 'medal'} size={16} /> {t.shop.unlockBy(badge(it.unlock))}</div>
            : <div className="flex items-center gap-0.5 text-[10px] text-yellow-800"><Sprite name="coin" size={16} /> {it.price.toLocaleString()}</div>)}
        </div>
        <button onClick={() => game.shop(it.id)} disabled={locked || (!own && s.gold < it.price)}
          className={`btn shrink-0 !px-2 !py-0.5 text-[11px] disabled:opacity-40 ${worn ? 'btn-pressed font-bold text-emerald-700' : ''}`}>
          {label}
        </button>
      </li>
    )
  }

  return (
    <Panel title={t.shop.title} icon={Store} glow="gold"
      action={<Gold gold={s.gold} className="text-xs text-retro-gold" />}>
      <p className="mb-3 text-[11px] text-slate-500">{t.shop.hint}</p>

      <div className="mb-1.5 text-xs font-semibold text-slate-300">{t.shop.gear}</div>
      {GEAR_SLOTS.map(slot => (
        <div key={slot} className="mb-3">
          <div className="mb-1 text-[11px] text-slate-500">{t.shop.slots[slot]}</div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SHOP.filter(x => x.kind === 'gear' && x.slot === slot).map(it => (
              <Item key={it.id} it={it} preview={
                // try-on: your current look with this piece swapped in
                <span className="grid h-[84px] w-14 shrink-0 place-items-center bg-[#0a0c24]"><Hero equip={{ ...s.equip, [slot]: it.id }} look={s.look} pose="still" size={80} /></span>
              } />
            ))}
          </ul>
        </div>
      ))}

      {(['title', 'frame'] as const).map(kind => (
        <div key={kind} className="mb-3 last:mb-0">
          <div className="mb-1.5 text-xs font-semibold text-slate-300">{kind === 'title' ? t.shop.titles : t.shop.frames}</div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SHOP.filter(x => x.kind === kind).map(it => (
              <Item key={it.id} it={it} preview={kind === 'frame'
                ? <span className={`grid h-[84px] w-14 shrink-0 place-items-center ${frameCls(it.id)}`}><Hero equip={s.equip} look={s.look} pose="still" size={80} /></span>
                : undefined} />
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  )
}
