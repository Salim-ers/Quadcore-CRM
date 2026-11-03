// Liens natifs : aucune API tierce, uniquement des URL standard (tel:, mailto:, wa.me, instagram.com)

export function normalizeInstagram(input: string | null): { handle: string | null; url: string | null } {
  if (!input || !input.trim()) return { handle: null, url: null }
  let v = input.trim()
  const m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
  if (m) v = m[1]
  v = v.replace(/^@/, '').replace(/\/$/, '')
  if (!/^[A-Za-z0-9._]{1,30}$/.test(v)) return { handle: v, url: null }
  return { handle: v, url: `https://www.instagram.com/${v}/` }
}

/** Numéro au format international sans « + » pour wa.me (FR par défaut). */
export function toInternational(phone: string | null): string | null {
  if (!phone) return null
  let d = phone.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0') && d.length === 10) d = '33' + d.slice(1)
  return d.length >= 8 ? d : null
}

export const telLink = (phone: string | null) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null)
export const whatsappLink = (phone: string | null, text?: string) => {
  const n = toInternational(phone)
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null
}
export const mailLink = (email: string | null, subject?: string) =>
  email ? `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}` : null

export function normalizeUrl(u: string | null): string | null {
  if (!u || !u.trim()) return null
  const v = u.trim()
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export const prettyUrl = (u: string | null) => (u ? u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '') : '')

export function formatPhone(p: string | null) {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 10 && d.startsWith('0')) return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  return p
}
