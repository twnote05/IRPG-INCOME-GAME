import { Database } from 'lucide-react'
import { useRef } from 'react'
import { localDate } from '../lib/game'
import type { Game } from '../lib/useGame'
import { download } from '../money/MoneySettings'
import { Panel } from './ui'

/** Where the investing side lives: sync status with the sheet, plus a backup file for when there's no sheet. */
export default function GameData({ game, onSheet }: { game: Game; onSheet: () => void }) {
  const { t, cloud } = game
  const file = useRef<HTMLInputElement>(null)
  const c = cloud.sync
  const status = c.state === 'local' ? t.gdata.local
    : c.state === 'syncing' ? t.gdata.syncing
    : c.state === 'old' ? t.gdata.old
    : c.state === 'error' ? t.gdata.error(c.error ?? '')
    : t.gdata.ok(new Date(c.at ?? Date.now()).toLocaleTimeString())
  return (
    <Panel title={t.gdata.title} icon={Database} glow="mana">
      <p className={`text-xs ${c.state === 'error' || c.state === 'old' ? 'text-red-700' : c.state === 'ok' ? 'text-emerald-700' : 'text-slate-400'}`}>{status}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {c.state === 'local'
          ? <button className="btn btn-primary" onClick={onSheet}>{t.gdata.connect}</button>
          : <button className="btn" onClick={cloud.syncNow} disabled={c.state === 'syncing'}>{t.gdata.syncNow}</button>}
        <button className="btn" onClick={() => download(`investor-rpg-game-${localDate()}.json`, game.exportGame())}>{t.gdata.backup}</button>
        <button className="btn" onClick={() => file.current?.click()}>{t.gdata.restore}</button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={async e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f || !confirm(t.gdata.restoreConfirm)) return
          alert(game.importGame(await f.text()) ? t.gdata.restored : t.gdata.restoreBad)
        }} />
        {game.hasBackup() && (
          <button className="btn" onClick={() => confirm(t.gdata.undoConfirm) && game.undoFirstSync() && alert(t.gdata.restored)}>{t.gdata.undo}</button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{t.gdata.note}</p>
    </Panel>
  )
}
