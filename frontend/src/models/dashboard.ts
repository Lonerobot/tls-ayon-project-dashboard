// TypeScript models mirroring the server-side Pydantic settings models.
// Keep in sync with server/settings/models.py.

export interface LinkItem {
  title: string
  url: string
  icon: string
  open_external: boolean
  enabled: boolean
}

export interface ContentBlock {
  title: string
  content: string
}

export interface HeaderSettings {
  project_title: string
  show_subtitle: boolean
  subtitle: string
  /** Injected at runtime by the backend — true when a banner file is stored. */
  has_banner: boolean
}

export interface SummaryItem {
  name: string
  content: string
}

export interface PersonItem {
  username: string
  role: string
  enabled: boolean
}

export interface DashboardData {
  enabled: boolean
  refs_enabled: boolean
  refs_thumbnail_size: number
  header: HeaderSettings
  content_blocks: ContentBlock[]
  summary: SummaryItem[]
  key_personnel: PersonItem[]
  links: LinkItem[]
}
