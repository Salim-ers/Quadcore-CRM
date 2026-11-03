// Supabase Edge Function — invitation d'un collaborateur (réservée aux administrateurs)
// Déploiement : supabase functions deploy invite-member --no-verify-jwt
// La vérification de l'appelant est faite ici : le contrôle intégré ne comprend que les anciennes clés JWT.
// Variables fournies automatiquement par Supabase : SUPABASE_URL, SUPABASE_SECRET_KEYS (ou SUPABASE_SERVICE_ROLE_KEY)
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Nouvelles clés secrètes d'abord, ancienne clé service_role sinon
function serverKey() {
  try {
    const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default
    if (key) return key as string
  } catch { /* variable absente ou illisible : on passe à l'ancienne clé */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), { auth: { persistSession: false } })
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ error: 'Non authentifié' }, 401)

  const { data: me } = await admin.from('profiles').select('role, active').eq('id', user.id).single()
  if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Réservé aux administrateurs' }, 403)

  const { email, first_name, last_name, role, redirect_to } = await req.json()
  if (!email || typeof email !== 'string') return json({ error: 'E-mail requis' }, 400)

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    data: { first_name: first_name ?? '', last_name: last_name ?? '' },
    redirectTo: redirect_to,
  })
  if (error) return json({ error: error.message }, 400)

  // Le profil est créé inactif par le trigger handle_new_user : l'invitation l'active et applique le rôle choisi.
  if (data.user) {
    const { error: activation } = await admin.from('profiles')
      .update({ active: true, role: role === 'admin' ? 'admin' : 'member' })
      .eq('id', data.user.id)
    if (activation) return json({ error: activation.message }, 500)
  }
  return json({ ok: true, id: data.user?.id })
})
