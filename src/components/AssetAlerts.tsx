import { Bell, BellRing, X } from 'lucide-react'
import { alertTip } from '../lib/i18n'
import type { Game } from '../lib/useGame'
import type { SpriteName } from '../lib/sprites'
import { Sprite } from './Sprite'
import { Panel } from './ui'

const ICON: Record<string, SpriteName> = { move: 'chart', loss: 'skull', gain: 'gem', short: 'lock', heavy: 'shield', stale: 'scroll' }
const TONE = { bad: 'text-red-700', warn: 'text-amber-800', info: 'text-blue-700' }

/** Asset watch: what in the portfolio needs a look, with advice for that kind of asset. */
export default function AssetAlerts({ game }: { game: Game }) {
  const { alerts, hideAlert, notifyPerm, enableNotify, t } = game
  const perm = notifyPerm === 'granted' ? t.alerts.on : notifyPerm === 'denied' ? t.alerts.blocked : notifyPerm === 'unsupported' ? t.alerts.unsupported : t.alerts.enable
  return (
    <Panel title={`${t.alerts.title}${alerts.length ? ` · ${alerts.length}` : ''}`} icon={Bell} glow="ruby" action={
      <button className="btn flex items-center gap-1 px-2 py-0.5 text-xs" onClick={enableNotify} disabled={notifyPerm !== 'default'} title={perm}>
        <BellRing size={13} /> <span className="max-sm:hidden">{perm}</span>
      </button>
    }>
      {alerts.length === 0 ? <p className="text-xs text-slate-500">{t.alerts.empty}</p> : (
        <ul className="space-y-2">
          {alerts.map(a => (
            <li key={a.id} className="flex items-start gap-2 text-xs">
              <Sprite name={ICON[a.kind]} size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className={`font-semibold ${TONE[a.level]}`}>{t.alerts.head(a)}</div>
                <div className="text-slate-400">{alertTip(t, a)}</div>
              </div>
              <button className="shrink-0 p-1 text-slate-500 hover:text-slate-200" onClick={() => hideAlert(a.id)} aria-label={t.alerts.hide} title={t.alerts.hide}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
