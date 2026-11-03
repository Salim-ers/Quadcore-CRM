import { useEffect, useState } from 'react'
import { backend } from '../data/store'

const cache = new Map<string, { url: string; at: number }>()

/** URL d'affichage d'un fichier stocké (URL signée Supabase, mise en cache 50 min). */
export function useFileUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => (path && cache.get(path)?.url) || null)
  useEffect(() => {
    let alive = true
    if (!path) { setUrl(null); return }
    const hit = cache.get(path)
    if (hit && Date.now() - hit.at < 50 * 60_000) { setUrl(hit.url); return }
    backend.fileUrl(path).then((u) => {
      cache.set(path, { url: u, at: Date.now() })
      if (alive) setUrl(u)
    }).catch(() => alive && setUrl(null))
    return () => { alive = false }
  }, [path])
  return url
}

export const fileUrlNow = async (path: string) => {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < 50 * 60_000) return hit.url
  const u = await backend.fileUrl(path)
  cache.set(path, { url: u, at: Date.now() })
  return u
}
