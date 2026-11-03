import type { DB, Profile, Row, TableName, UUID } from '../lib/types'

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'
export type ChangeListener = (table: TableName, event: ChangeEvent, row: Record<string, unknown>) => void

export interface InviteInput { email: string; first_name: string; last_name: string; role: 'admin' | 'member' }

/** Contrat commun : Supabase en production, stockage local pour la démo. */
export interface Backend {
  readonly mode: 'supabase' | 'demo'
  /** Identifiant du compte connecté (null si déconnecté) */
  currentUserId(): Promise<UUID | null>
  onAuthChange(cb: (userId: UUID | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  /** true si l'utilisateur arrive d'un lien d'invitation / réinitialisation */
  needsPasswordSetup(): boolean

  loadAll(): Promise<DB>
  insert<T extends TableName>(table: T, row: Partial<Row<T>>): Promise<Row<T>>
  update<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<Row<T>>
  remove(table: TableName, id: UUID): Promise<void>
  subscribe(cb: ChangeListener): () => void

  uploadFile(path: string, file: File): Promise<string>
  fileUrl(path: string): Promise<string>
  removeFile(path: string): Promise<void>

  inviteMember(input: InviteInput): Promise<void>
  /** Démo uniquement : comptes proposés à la connexion */
  demoAccounts?(): Profile[]
}
