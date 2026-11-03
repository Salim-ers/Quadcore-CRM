import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

/** Date locale (et non UTC) au format YYYY-MM-DD */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayStr = () => ymd(new Date())
export const addDaysStr = (n: number, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return ymd(d) }

export function endOfWeekStr() {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7 // lundi = 0
  return addDaysStr(6 - dow, d)
}

const asDate = (s: string) => (s.length === 10 ? parseISO(s + 'T12:00:00') : parseISO(s))

/** « Aujourd'hui », « Demain », « Hier », « Dans 3 j », « Lun. 12 nov. » */
export function dueLabel(s: string | null): string {
  if (!s) return ''
  const diff = differenceInCalendarDays(asDate(s), new Date())
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff < 0) return `En retard de ${-diff} j`
  if (diff < 7) return format(asDate(s), 'EEEE', { locale: fr }).replace(/^./, (c) => c.toUpperCase())
  return format(asDate(s), 'd MMM', { locale: fr })
}

export const dueTone = (s: string | null): 'late' | 'today' | 'soon' | 'later' | 'none' => {
  if (!s) return 'none'
  const diff = differenceInCalendarDays(asDate(s), new Date())
  return diff < 0 ? 'late' : diff === 0 ? 'today' : diff <= 2 ? 'soon' : 'later'
}

export const longDate = (s: string | null) => (s ? format(asDate(s), 'EEEE d MMMM yyyy', { locale: fr }) : '—')
export const shortDate = (s: string | null) => (s ? format(asDate(s), 'd MMM yyyy', { locale: fr }) : '—')

export function relTime(iso: string) {
  const d = parseISO(iso)
  const mins = (Date.now() - d.getTime()) / 60000
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${Math.floor(mins)} min`
  if (isToday(d)) return `Aujourd'hui, ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Hier, ${format(d, 'HH:mm')}`
  if (mins < 60 * 24 * 6) return format(d, "EEEE, HH:mm", { locale: fr }).replace(/^./, (c) => c.toUpperCase())
  return format(d, 'd MMM, HH:mm', { locale: fr })
}

export const since = (iso: string) => formatDistanceToNowStrict(parseISO(iso), { locale: fr })

export function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir'
}

export const todayLong = () => format(new Date(), 'EEEE d MMMM', { locale: fr }).replace(/^./, (c) => c.toUpperCase())
