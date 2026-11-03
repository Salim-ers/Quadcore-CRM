// Cloudflare Pages Function : sert Neon Auth depuis le domaine de l'app.
// Hébergé chez Neon, le cookie de session serait un cookie tiers, que Safari et iPhone bloquent ;
// relayé ici, il devient un cookie du site et la connexion tient après un rechargement.
// Variable à définir dans Cloudflare : NEON_AUTH_URL (Neon › Auth › Configuration).

interface Context { request: Request; env: { NEON_AUTH_URL?: string } }

// Neon refuse une requête qui annonce un autre hôte (« Invalid hostname header ») : on n'envoie que l'utile
const FORWARDED_HEADERS = ['accept', 'content-type', 'cookie', 'origin', 'referer', 'user-agent', 'authorization', 'x-neon-client-info']

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  if (!env.NEON_AUTH_URL) return Response.json({ message: 'NEON_AUTH_URL manquante' }, { status: 500 })

  const incoming = new URL(request.url)
  const target = env.NEON_AUTH_URL.replace(/\/$/, '') + incoming.pathname.replace(/^\/api\/auth/, '') + incoming.search
  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  })

  const response = new Response(upstream.body, upstream)
  response.headers.set('Cache-Control', 'no-store')
  // Un cookie limité au domaine de Neon serait rejeté par le navigateur sur le nôtre
  response.headers.delete('Set-Cookie')
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', cookie.replace(/;\s*Domain=[^;]*/i, ''))
  }
  return response
}
