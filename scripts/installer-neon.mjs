// Installe QUADCORE sur le projet Neon lié : schéma, CORS du bucket, comptes des quatre associés.
// Prérequis : `npx neon link`, `npx neon deploy` puis `npx neon env pull` (voir README).
// Sans danger à relancer : ce qui existe déjà est conservé.
//
//   APP_URL=https://quadcore-crm.vercel.app npm run neon:installer
//   Ajouter --envoyer-liens pour envoyer à chacun le lien « choisir mon mot de passe » (valable 1 heure).
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

for (const f of ['.env', '.env.local']) if (existsSync(f)) process.loadEnvFile(f)

const need = (name) => {
  if (!process.env[name]) { console.error(`Variable manquante : ${name} (voir le README, section Mise en ligne).`); process.exit(1) }
  return process.env[name]
}
const APP_URL = need('APP_URL').replace(/\/$/, '')
const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED || need('DATABASE_URL')
const BUCKET = 'quadcore-fichiers'
const team = JSON.parse(readFileSync('src/lib/team.json', 'utf8'))
// Le CLI est appelé sans shell : sous Windows, un shell couperait les noms qui contiennent des espaces
const neon = (...args) => execFileSync(process.execPath, ['node_modules/neon/dist/cli.js', ...args], { encoding: 'utf8' })
const step = (s) => console.log(`\n— ${s}`)

const db = new pg.Client({ connectionString: DATABASE_URL })
await db.connect()

step('Schéma de la base')
await db.query('create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())')
for (const file of readdirSync('db/migrations').filter((f) => f.endsWith('.sql')).sort()) {
  const { rowCount } = await db.query('select 1 from public._migrations where name = $1', [file])
  if (rowCount) { console.log(`  déjà appliqué : ${file}`); continue }
  await db.query('begin')
  try {
    await db.query(readFileSync(join('db/migrations', file), 'utf8'))
    await db.query('insert into public._migrations (name) values ($1)', [file])
    await db.query('commit')
    console.log(`  appliqué : ${file}`)
  } catch (e) {
    await db.query('rollback')
    throw e
  }
}
await db.query('alter table public._migrations enable row level security')
neon('data-api', 'refresh-schema', '--database', new URL(DATABASE_URL).pathname.slice(1))

step('Authentification')
neon('neon-auth', 'config', 'email-password', 'update', '--disable-sign-up')
console.log('  inscriptions publiques fermées')
try { neon('neon-auth', 'domain', 'add', APP_URL); console.log(`  domaine autorisé : ${APP_URL}`) } catch { console.log(`  domaine déjà autorisé : ${APP_URL}`) }
neon('neon-auth', 'domain', 'allow-localhost', 'disable')
console.log('  accès depuis localhost fermé')

step('Fichiers : envoi direct depuis le navigateur')
const s3 = new S3Client({ region: need('AWS_REGION'), endpoint: need('AWS_ENDPOINT_URL_S3'), forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED' })
await s3.send(new PutBucketCorsCommand({
  Bucket: BUCKET,
  CORSConfiguration: { CORSRules: [{ AllowedOrigins: [APP_URL], AllowedMethods: ['PUT', 'GET'], AllowedHeaders: ['*'], MaxAgeSeconds: 3600 }] },
}))
console.log(`  ${BUCKET} accepte ${APP_URL}`)

step('Les quatre associés')
const authUser = async (email) => (await db.query('select id from neon_auth."user" where lower(email) = lower($1)', [email])).rows[0]?.id
for (const m of team) {
  if (!(await authUser(m.email))) neon('neon-auth', 'user', 'create', '--email', m.email, '--name', `${m.first_name} ${m.last_name}`)
  const id = await authUser(m.email)
  if (!id) throw new Error(`Compte introuvable après création : ${m.email}`)
  neon('neon-auth', 'user', 'set-role', id, '--roles', m.role === 'admin' ? 'admin' : 'user')
  const { rowCount } = await db.query(
    `insert into public.profiles (id, email, first_name, last_name, role, color) values ($1, $2, $3, $4, $5, $6) on conflict (id) do nothing`,
    [id, m.email, m.first_name, m.last_name, m.role, m.color],
  )
  console.log(`  ${m.first_name} ${m.last_name} <${m.email}>${rowCount ? '' : ' (déjà présent)'}`)
}

step('Vérification des droits')
const salim = await authUser(team[0].email)
await db.query('begin')
try {
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: salim, role: 'authenticated' })])
  await db.query('set local role authenticated')
  const { rows } = await db.query('select public.is_member() as member, (select count(*) from public.profiles)::int as team')
  if (rows[0].member && rows[0].team === team.length) console.log('  un associé connecté voit bien l’équipe')
  else console.log(`  À VÉRIFIER : is_member = ${rows[0].member}, profils visibles = ${rows[0].team}`)
} catch (e) {
  console.log(`  Vérification impossible depuis ce script (${e.message}) : testez une connexion dans l’app.`)
} finally {
  await db.query('rollback')
}
await db.end()

if (process.argv.includes('--envoyer-liens')) {
  step('Liens « choisir mon mot de passe » (valables 1 heure)')
  for (const m of team) {
    const res = await fetch(`${need('NEON_AUTH_BASE_URL').replace(/\/$/, '')}/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: APP_URL },
      body: JSON.stringify({ email: m.email, redirectTo: APP_URL }),
    })
    console.log(`  ${m.email} : ${res.ok ? 'envoyé' : `échec ${res.status} ${await res.text()}`}`)
  }
}
console.log('\nInstallation terminée.')
