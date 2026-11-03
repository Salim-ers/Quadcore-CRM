import { addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, formatDistanceToNowStrict, isToday, isYesterday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
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

// ———————————————————————— Calendrier : la semaine commence le lundi ————————————————————————
const capitalized = (s: string) => s.replace(/^./, (c) => c.toUpperCase())
export const shiftDays = (s: string, n: number) => ymd(addDays(asDate(s), n))
export const shiftMonths = (s: string, n: number) => ymd(addMonths(asDate(s), n))
export const weekDays = (s: string) => Array.from({ length: 7 }, (_, i) => ymd(addDays(startOfWeek(asDate(s), { weekStartsOn: 1 }), i)))
export const monthDays = (s: string) => eachDayOfInterval({
  start: startOfWeek(startOfMonth(asDate(s)), { weekStartsOn: 1 }),
  end: endOfWeek(endOfMonth(asDate(s)), { weekStartsOn: 1 }),
}).map(ymd)
export const dayLabel = (s: string) => capitalized(format(asDate(s), 'EEEE d MMMM', { locale: fr }))
export const dayShort = (s: string) => ({ name: capitalized(format(asDate(s), 'EEE', { locale: fr })).replace('.', ''), number: format(asDate(s), 'd') })
export const monthLabel = (s: string) => capitalized(format(asDate(s), 'MMMM yyyy', { locale: fr }))
export const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7)
export function weekLabel(s: string) {
  const days = weekDays(s), first = asDate(days[0]), last = asDate(days[6])
  return first.getMonth() === last.getMonth()
    ? `${format(first, 'd')} au ${format(last, 'd MMMM yyyy', { locale: fr })}`
    : `${format(first, 'd MMM', { locale: fr })} au ${format(last, 'd MMM yyyy', { locale: fr })}`
}

export const todayLong = () => format(new Date(), 'EEEE d MMMM', { locale: fr }).replace(/^./, (c) => c.toUpperCase())
