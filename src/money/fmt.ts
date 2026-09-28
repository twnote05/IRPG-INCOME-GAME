import type { Lang } from '../lib/i18n'
import { validMonth } from './logic'

export const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmt0 = (n: number) => Math.round(n).toLocaleString('th-TH')

const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MON = { th: TH_MON, en: EN_MON }

/** "ส.ค. 69" (Buddhist era, 2 digits) or "Aug 26". Bad keys pass through instead of printing "undefined NaN". */
export const monthLabel = (m: string, lang: Lang) => validMonth(m)
  ? `${MON[lang][+m.slice(5, 7) - 1]} ${lang === 'th' ? +m.slice(0, 4) + 543 - 2500 : m.slice(2, 4)}`
  : String(m ?? '—')
export const monShort = (m: string, lang: Lang) => MON[lang][+m.slice(5, 7) - 1] ?? m
export const dayLabel = (d: string, lang: Lang) => {
  const [, mo, da] = d.split('-')
  return lang === 'th' ? `${+da} ${TH_MON[+mo - 1]}` : `${EN_MON[+mo - 1]} ${+da}`
}
export const yearLabel = (y: string, lang: Lang) => (lang === 'th' ? String(+y + 543) : y)
