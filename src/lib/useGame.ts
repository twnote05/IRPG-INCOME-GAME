import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Asset, GameState, Profile, Tx } from '../types'
import { BOSS_REWARD, QUESTS, SHOP, assetAlerts, boost, boosted, questReward, applyQuotes, computeStats, localDate, monthKey, periodKey, quoteKey, type Quest } from './game'
import { useLivePrices } from './livePrices'
import type { MoneySummary, Reward } from '../money/logic'
import { DICT, alertTip } from './i18n'
import { loadPrefs, loadState, parseState, savePrefs, saveState, seed, uid, type Prefs } from './storage'
import { BACKUP, useGameSync } from './useGameSync'
import type { GasConfig } from '../money/useMoney'

const HIDDEN_KEY = 'investor-rpg:alerts.hidden' // alert id -> hidden until (YYYY-MM-DD)
const SENT_KEY = 'investor-rpg:alerts.sent' // alert ids already pushed as OS notifications
const readJson = (k: string): Record<string, string> => { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }
const writeJson = (k: string, v: object) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage blocked */ } }

export type Tone = 'gold' | 'emerald' | 'ruby' | 'mana'
export interface Toast { id: string; text: string; tone: Tone }

/** Pure quest reward: same state back if the quest is already done this period. */
function grant(st: GameState, q: Quest): GameState {
  const key = periodKey(q.period)
  if (st.quests[q.id] === key) return st
  const r = questReward(st, q)
  return {
    ...st,
    quests: { ...st.quests, [q.id]: key },
    questExp: st.questExp + r.exp,
    gold: st.gold + r.gold,
    newsRead: st.newsRead + (q.int ? 1 : 0),
  }
}

const tx = (kind: Tx['kind'], sym: string, amount: number): Tx => ({ id: uid(), date: localDate(), kind, label: '', sym, amount })

export function useGame(money?: MoneySummary & { rewards?: Reward[] }, gas: GasConfig | null = null) {
  const [s, setS] = useState<GameState>(loadState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  useEffect(() => saveState(s), [s])
  const cloud = useGameSync(s, setS, gas)
  // backup file / restore: the same JSON the sheet stores
  const exportGame = () => JSON.stringify(s, null, 1)
  const importGame = (raw: string) => { const next = parseState(raw); if (next) setS(next); return !!next }
  const hasBackup = () => { try { return !!localStorage.getItem(BACKUP) } catch { return false } }
  const undoFirstSync = () => { try { const raw = localStorage.getItem(BACKUP); return raw ? importGame(raw) : false } catch { return false } }
  useEffect(() => {
    savePrefs(prefs)
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.lang = prefs.lang
  }, [prefs])
  const t = DICT[prefs.lang]
  const dark = prefs.theme === 'dark'
  const toggleLang = () => setPrefs(p => ({ ...p, lang: p.lang === 'th' ? 'en' : 'th' }))
  const toggleTheme = () => setPrefs(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))
  const live = useLivePrices(s.assets.map(quoteKey).filter((k): k is string => !!k))
  useEffect(() => {
    setS(prev => {
      const assets = applyQuotes(prev.assets, live.quotes)
      return assets === prev.assets ? prev : { ...prev, assets }
    })
  }, [live.quotes])
  const stats = useMemo(() => computeStats(s), [s])

  // Asset watch: hidden alerts stay hidden for 7 days; warn/bad ones also go to the OS once each (device-local)
  const [hidden, setHidden] = useState<Record<string, string>>(() => readJson(HIDDEN_KEY))
  const allAlerts = useMemo(() => assetAlerts(s, live.quotes), [s, live.quotes])
  const alerts = allAlerts.filter(a => !(hidden[a.id] >= localDate()))
  const hideAlert = (id: string) => setHidden(h => {
    const next = Object.fromEntries(Object.entries(h).filter(([k]) => allAlerts.some(a => a.id === k)))
    next[id] = localDate(new Date(Date.now() + 7 * 86400000))
    writeJson(HIDDEN_KEY, next)
    return next
  })
  const [notifyPerm, setNotifyPerm] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))
  const enableNotify = async () => { if (typeof Notification !== 'undefined') setNotifyPerm(await Notification.requestPermission()) }
  const alertKey = alerts.map(a => a.id).join('|')
  useEffect(() => {
    if (notifyPerm !== 'granted') return
    const sent = readJson(SENT_KEY)
    const fresh = alerts.filter(a => a.level !== 'info' && !sent[a.id])
    if (!fresh.length) return
    const shown = fresh.slice(0, 3) // the rest go out on the next change
    for (const a of shown) {
      try { new Notification(t.alerts.head(a), { body: alertTip(t, a), icon: 'icon-192.png', tag: a.id }) } catch { /* phones need a service worker for this: in-app list still shows it */ }
    }
    writeJson(SENT_KEY, Object.fromEntries(allAlerts.filter(a => sent[a.id] || shown.includes(a)).map(a => [a.id, 1])))
  }, [alertKey, notifyPerm]) // eslint-disable-line react-hooks/exhaustive-deps

  const toast = useCallback((text: string, tone: Tone = 'gold') => {
    const id = uid()
    setToasts(t => [...t, { id, text, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800)
  }, [])

  const isDone = (q: Quest) => s.quests[q.id] === periodKey(q.period)

  // Returns the state with the quest reward applied (no-op if already done this period).
  const withQuest = (st: GameState, q: Quest): GameState => {
    const next = grant(st, q)
    if (next !== st) { const r = questReward(st, q); toast(t.toast.quest(t.quests.names[q.id], r.exp, r.gold), 'emerald') }
    return next
  }

  const completeQuest = (q: Quest) => setS(withQuest(s, q))

  const upsertAsset = (a: Omit<Asset, 'id'> & { id?: string }) => {
    if (a.id) {
      setS({ ...s, assets: s.assets.map(x => (x.id === a.id ? (a as Asset) : x)), txs: [tx('edit', a.symbol, a.currentValue), ...s.txs] })
      toast(t.toast.updated(a.symbol), 'mana')
    } else {
      setS({ ...s, assets: [...s.assets, { ...a, id: uid() }], txs: [tx('buy', a.symbol, a.invested), ...s.txs] })
      toast(t.toast.acquired(a.symbol))
    }
  }

  const deleteAsset = (id: string) => {
    const a = s.assets.find(x => x.id === id)
    if (!a) return
    setS({ ...s, assets: s.assets.filter(x => x.id !== id), txs: [tx('remove', a.symbol, a.currentValue), ...s.txs] })
    toast(t.toast.removed(a.symbol), 'ruby')
  }

  /** Payday boss strike: record a DCA deposit into an existing asset. */
  const deposit = (assetId: string, amount: number) => {
    const a = s.assets.find(x => x.id === assetId)
    if (!a || !(amount > 0)) return
    let next: GameState = {
      ...s,
      assets: s.assets.map(x => (x.id === assetId ? { ...x, invested: x.invested + amount, currentValue: x.currentValue + amount } : x)),
      txs: [tx('deposit', a.symbol, amount), ...s.txs],
    }
    toast(t.toast.strike(amount.toLocaleString()), 'ruby')
    next = withQuest(next, QUESTS.find(q => q.id === 'dca')!)
    const month = monthKey()
    if (stats.deposited + amount >= s.profile.monthlyBudget && next.bossDefeated !== month) {
      const r = boosted(BOSS_REWARD, boost(s, 'boss'))
      next = { ...next, bossDefeated: month, questExp: next.questExp + r.exp, gold: next.gold + r.gold }
      toast(t.toast.bossDown(r.exp, r.gold))
    }
    setS(next)
  }

  // Real numbers from the Money menu drive STR (income vs spending) and MP (the investing bucket).
  useEffect(() => {
    const sm = money
    if (!sm || !(sm.income > 0 || sm.loggedToday)) return
    const q = QUESTS.find(x => x.id === 'expenses')!
    const logQuest = sm.loggedToday && s.quests[q.id] !== periodKey(q.period)
    if (logQuest) { const r = questReward(s, q); toast(t.toast.quest(t.quests.names[q.id], r.exp, r.gold), 'emerald') }
    setS(prev => {
      const p = prev.profile
      const profile = {
        ...p,
        monthlyIncome: sm.income || p.monthlyIncome,
        monthlyExpense: sm.avgExpense || p.monthlyExpense,
        monthlyBudget: sm.investBudget || p.monthlyBudget,
      }
      const same = profile.monthlyIncome === p.monthlyIncome && profile.monthlyExpense === p.monthlyExpense && profile.monthlyBudget === p.monthlyBudget
      let next = same ? prev : { ...prev, profile }
      if (sm.loggedToday) next = grant(next, q) // "record daily expenses" completes itself
      return next
    })
  }, [money?.income, money?.avgExpense, money?.investBudget, money?.loggedToday]) // eslint-disable-line react-hooks/exhaustive-deps

  // Money-side rewards (good days, cleared dungeons, slain debts, chests, badges): each paid out once
  const rewardKey = money?.rewards?.map(r => r.id).join('|')
  useEffect(() => {
    const fresh = (money?.rewards ?? []).filter(r => !s.claimed[r.id])
    if (!fresh.length) return
    const pay = (r: Reward) => boosted(r, boost(s, r.kind))
    for (const r of fresh.slice(0, 3)) { const p = pay(r); toast(t.adv.got(t.adv.label(r, t.adv.ach[r.arg]?.[0]), p.exp, p.gold), r.kind === 'ach' ? 'mana' : 'gold') }
    if (fresh.length > 3) toast(t.adv.more(fresh.length - 3), 'gold')
    setS(prev => {
      const claimed = { ...prev.claimed }
      let exp = 0, gold = 0
      for (const r of fresh) if (!claimed[r.id]) { claimed[r.id] = 1; const p = pay(r); exp += p.exp; gold += p.gold }
      return { ...prev, claimed, questExp: prev.questExp + exp, gold: prev.gold + gold }
    })
  }, [rewardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Buy (and wear) a shop item, or toggle wearing one already owned. */
  const shop = (id: string) => {
    const it = SHOP.find(x => x.id === id)
    if (!it) return
    const wear = (st: GameState): GameState => it.kind === 'gear'
      ? { ...st, equip: { ...st.equip, [it.slot!]: st.equip[it.slot!] === id ? undefined : id } }
      : { ...st, [it.kind]: st[it.kind] === id ? '' : id }
    if (s.owned.includes(id)) return setS(wear(s))
    if (it.unlock && !s.claimed[it.unlock]) return toast(t.shop.locked, 'ruby')
    if (s.gold < it.price) return toast(t.shop.poor, 'ruby')
    setS(wear({ ...s, gold: s.gold - it.price, owned: [...s.owned, id] }))
    toast(t.shop.bought(t.shop.items[id]), 'gold')
  }

  const setLook = (l: Partial<GameState['look']>) => setS({ ...s, look: { ...s.look, ...l } })

  const updateProfile = (p: Partial<Profile>) => setS({ ...s, profile: { ...s.profile, ...p } })
  const reset = () => setS(seed())

  return { cloud, exportGame, importGame, hasBackup, undoFirstSync, alerts, hideAlert, notifyPerm, enableNotify, moneyLinked: !!money && money.income > 0, live, t, dark, lang: prefs.lang, toggleLang, toggleTheme, s, stats, toasts, isDone, completeQuest, upsertAsset, deleteAsset, deposit, updateProfile, reset, shop, setLook }
}
export type Game = ReturnType<typeof useGame>
