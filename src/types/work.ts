export type WorkType = 'skill' | 'agent' | 'orchestration'
export type WorkStatus = 'draft' | 'completed' | 'exported'

export interface Work {
  id: number
  name: string
  type: WorkType
  base_pattern_id: number | null
  status: WorkStatus
  export_path: string | null
  created_at: string
  updated_at: string
}

export type FileType = 'skill_md' | 'agent_md' | 'reference' | 'config'

export interface WorkFile {
  id: number
  work_id: number
  file_name: string
  file_path: string
  file_type: FileType | null
}
