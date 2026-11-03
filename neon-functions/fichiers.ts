// Neon Function : donne accès au bucket privé des fichiers, aux seuls membres actifs.
// Le navigateur reçoit des URL signées et de courte durée ; les clés S3 ne quittent jamais le serveur.
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const BUCKET = 'quadcore-fichiers'
const MAX_BYTES = 20 * 1024 * 1024
const READ_SECONDS = 60 * 60
const UPLOAD_SECONDS = 5 * 60
// Forme des chemins écrits par actions.ts : <type de dossier>/<id>/<nom assaini>
const VALID_PATH = /^(prospect|project|revision|task|ticket)\/[\w-]+\/[\w.-]+$/

const CORS = {
  // Aucun cookie ici : seul le jeton Bearer donne accès, l'origine n'a donc pas à être restreinte
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS })

export interface Storage {
  signPut(path: string, contentType: string): Promise<string>
  signGet(path: string): Promise<string>
  remove(path: string): Promise<void>
}

export interface Directory {
  /** La Data API valide le jeton et applique la RLS : c'est elle qui dit si l'appelant est membre. */
  isMember(authorization: string): Promise<boolean>
  /** Le fichier est-il encore rattaché à un dossier visible par l'appelant ? */
  isReferenced(authorization: string, path: string): Promise<boolean>
}

export async function handle(request: Request, storage: Storage, directory: Directory): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ') || !(await directory.isMember(authorization))) {
    return json({ error: 'Accès réservé aux membres de QUADCORE' }, 401)
  }

  const body = (await request.json().catch(() => null)) as { op?: string; path?: string; contentType?: string; size?: number } | null
  const path = body?.path ?? ''
  if (!VALID_PATH.test(path)) return json({ error: 'Chemin de fichier invalide' }, 400)

  const route = new URL(request.url).pathname.replace(/\/$/, '')
  if (route === '/sign' && body?.op === 'get') return json({ url: await storage.signGet(path) })
  if (route === '/sign' && body?.op === 'put') {
    if ((body.size ?? 0) > MAX_BYTES) return json({ error: 'Fichier trop lourd : 20 Mo maximum.' }, 413)
    return json({ url: await storage.signPut(path, body.contentType || 'application/octet-stream') })
  }
  if (route === '/delete') {
    // La RLS décide qui peut retirer une pièce jointe ; le fichier ne part qu'une fois sa ligne supprimée
    if (await directory.isReferenced(authorization, path)) return json({ error: 'Ce fichier est encore rattaché à un dossier' }, 409)
    await storage.remove(path)
    return json({ ok: true })
  }
  return json({ error: 'Route inconnue' }, 404)
}

function s3Storage(): Storage {
  // Variables AWS_* injectées par Neon
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
  return {
    signPut: (Key, ContentType) => getSignedUrl(s3, new PutObjectCommand({ Bucket: BUCKET, Key, ContentType }), { expiresIn: UPLOAD_SECONDS }),
    signGet: (Key) => getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: READ_SECONDS }),
    remove: async (Key) => { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key })) },
  }
}

function dataApiDirectory(): Directory {
  // Variable NEON_DATA_API_URL injectée par Neon
  const api = (process.env.NEON_DATA_API_URL ?? '').replace(/\/$/, '')
  return {
    async isMember(authorization) {
      const res = await fetch(`${api}/rpc/is_member`, { method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' }, body: '{}' })
      return res.ok && (await res.json()) === true
    },
    async isReferenced(authorization, path) {
      const res = await fetch(`${api}/attachments?select=id&file_path=eq.${encodeURIComponent(path)}`, { headers: { Authorization: authorization } })
      return !res.ok || ((await res.json()) as unknown[]).length > 0
    },
  }
}

export default {
  fetch: (request: Request) => handle(request, s3Storage(), dataApiDirectory()),
}
