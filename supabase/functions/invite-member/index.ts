// Supabase Edge Function — invitation d'un collaborateur (réservée aux administrateurs)
// Déploiement : supabase functions deploy invite-member
// Variables fournies automatiquement par Supabase : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json({ error: 'Non authentifié' }, 401)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: me } = await admin.from('profiles').select('role, active').eq('id', user.id).single()
  if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Réservé aux administrateurs' }, 403)

  const { email, first_name, last_name, role, redirect_to } = await req.json()
  if (!email || typeof email !== 'string') return json({ error: 'E-mail requis' }, 400)

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    data: { first_name: first_name ?? '', last_name: last_name ?? '' },
    redirectTo: redirect_to,
  })
  if (error) return json({ error: error.message }, 400)

  // Le profil est créé par le trigger handle_new_user ; on applique le rôle choisi côté serveur.
  if (role === 'admin' && data.user) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
  }
  return json({ ok: true, id: data.user?.id })
})
