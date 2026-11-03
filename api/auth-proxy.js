// Vercel Function : sert Neon Auth depuis le domaine de l'app (voir la réécriture dans vercel.json).
// Hébergé chez Neon, le cookie de session serait un cookie tiers, que Safari et iPhone bloquent ;
// relayé ici, il devient un cookie du site et la connexion tient après un rechargement.
// C'est une fonction et non une simple réécriture vers Neon : Vercel y ajouterait X-Forwarded-Host,
// et Neon refuse une requête qui annonce un autre hôte (« Invalid hostname header »).

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL || 'https://ep-bold-lake-baytrxhn.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth'
const FORWARDED_HEADERS = ['accept', 'content-type', 'cookie', 'origin', 'referer', 'user-agent', 'authorization', 'x-neon-client-info']
// fetch décompresse la réponse : ces en-têtes ne décriraient plus le corps renvoyé
const STALE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie']

export default {
  async fetch(request) {
    const incoming = new URL(request.url)
    const path = incoming.searchParams.get('path') ?? incoming.pathname.replace(/^\/api\/auth\/?/, '')
    if (path.split('/').includes('..')) return Response.json({ message: 'Chemin invalide' }, { status: 400 })
    incoming.searchParams.delete('path')

    const headers = new Headers()
    for (const name of FORWARDED_HEADERS) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }

    const upstream = await fetch(`${NEON_AUTH_URL.replace(/\/$/, '')}/${path}${incoming.search}`, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    })

    const out = new Headers(upstream.headers)
    for (const name of STALE_HEADERS) out.delete(name)
    out.set('Cache-Control', 'no-store')
    // Un cookie limité au domaine de Neon serait rejeté par le navigateur sur le nôtre
    for (const cookie of upstream.headers.getSetCookie()) out.append('Set-Cookie', cookie.replace(/;\s*Domain=[^;]*/i, ''))
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
  },
}
