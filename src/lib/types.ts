// Modèle de données — miroir exact du schéma Supabase (supabase/migrations)

export type UUID = string
export type ISODate = string // YYYY-MM-DD
export type ISODateTime = string

export type Role = 'admin' | 'member'

export type ProspectStatus =
  | 'a_prospecter'
  | 'contacte'
  | 'en_attente'
  | 'a_relancer'
  | 'interesse'
  | 'demo_proposee'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu'

export type ProjectStatus =
  | 'a_preparer'
  | 'demo_creation'
  | 'demo_prete'
  | 'demo_envoyee'
  | 'attente_validation'
  | 'modifs_demandees'
  | 'demo_refusee'
  | 'demo_validee'
  | 'dev_final'
  | 'pret_livrer'
  | 'livre'
  | 'maintenance'

export type Category = 'restaurant' | 'cafe' | 'boulangerie' | 'barber' | 'artisan' | 'commerce' | 'autre'
export type Priority = 'basse' | 'normale' | 'haute'
export type ProjectType = 'vitrine' | 'ecommerce' | 'click_collect' | 'application' | 'autre'
export type BillingStatus = 'non_facture' | 'devis_envoye' | 'acompte_recu' | 'facture' | 'paye'
export type WorkStatus = 'a_faire' | 'en_cours' | 'termine'
export type EntityType = 'prospect' | 'project' | 'revision' | 'task'

export interface Profile {
  id: UUID
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: Role
  color: string
  active: boolean
  created_at: ISODateTime
}

export interface Prospect {
  id: UUID
  name: string
  logo_path: string | null
  category: Category | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  instagram_handle: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  linkedin_url: string | null
  website_url: string | null
  source: string | null
  service: string | null
  notes: string | null
  owner_id: UUID | null
  priority: Priority
  status: ProspectStatus
  lost_reason: string | null
  next_follow_up: ISODate | null
  archived: boolean
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Project {
  id: UUID
  prospect_id: UUID | null
  name: string
  type: ProjectType
  description: string | null
  owner_id: UUID | null
  start_date: ISODate | null
  due_date: ISODate | null
  demo_url: string | null
  final_url: string | null
  github_url: string | null
  price_proposed: number | null
  price_accepted: number | null
  billing_status: BillingStatus
  status: ProjectStatus
  revision_round: number
  archived: boolean
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Revision {
  id: UUID
  project_id: UUID
  round: number
  description: string
  status: WorkStatus
  assignee_id: UUID | null
  due_date: ISODate | null
  position: number
  created_by: UUID | null
  completed_at: ISODateTime | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Task {
  id: UUID
  title: string
  description: string | null
  assignee_id: UUID | null
  due_date: ISODate | null
  priority: Priority
  status: WorkStatus
  prospect_id: UUID | null
  project_id: UUID | null
  is_follow_up: boolean
  created_by: UUID | null
  completed_at: ISODateTime | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Comment {
  id: UUID
  entity_type: EntityType
  entity_id: UUID
  author_id: UUID | null
  body: string
  created_at: ISODateTime
}

export interface Attachment {
  id: UUID
  entity_type: EntityType
  entity_id: UUID
  file_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by: UUID | null
  created_at: ISODateTime
}

export interface StatusChange {
  id: UUID
  entity_type: 'prospect' | 'project'
  entity_id: UUID
  from_status: string | null
  to_status: string
  note: string | null
  changed_by: UUID | null
  created_at: ISODateTime
}

export type ActivityType =
  | 'prospect_added'
  | 'prospect_status'
  | 'prospect_contacted'
  | 'prospect_won'
  | 'prospect_lost'
  | 'project_created'
  | 'project_status'
  | 'demo_sent'
  | 'revision_requested'
  | 'revisions_done'
  | 'demo_validated'
  | 'site_delivered'
  | 'follow_up_done'
  | 'task_done'
  | 'comment_added'
  | 'file_added'

export interface Activity {
  id: UUID
  type: ActivityType
  actor_id: UUID | null
  prospect_id: UUID | null
  project_id: UUID | null
  meta: Record<string, unknown>
  created_at: ISODateTime
}

export interface DB {
  profiles: Profile[]
  prospects: Prospect[]
  projects: Project[]
  revisions: Revision[]
  tasks: Task[]
  comments: Comment[]
  attachments: Attachment[]
  status_history: StatusChange[]
  activities: Activity[]
}

export type TableName = keyof DB
export type Row<T extends TableName> = DB[T][number]
