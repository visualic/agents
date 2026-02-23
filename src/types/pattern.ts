export type PatternType = 'skill' | 'agent' | 'orchestration'
export type PatternSource = 'internal' | 'external'

export interface Pattern {
  id: number
  name: string
  type: PatternType
  description: string | null
  source: PatternSource
  source_url: string | null
  structure_preview: string | null
  file_path: string
  created_at: string
  updated_at: string
  tag_names?: string
}

export interface PatternFilter {
  type?: PatternType
  source?: PatternSource
  search?: string
  tags?: string[]
}
