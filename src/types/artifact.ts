export type ArtifactType = 'skill' | 'agent' | 'orchestration' | 'tooling' | 'reference'
export type ArtifactStatus = 'curated' | 'review' | 'verified' | 'promoted' | 'rejected'

export interface QualityScores {
  relevance: number
  reproducibility: number
  maintenance: number
  structure: number
  evidence: number
  license_clarity: number
  risk_penalty: number
  total: number
}

export interface Artifact {
  id: number
  run_id: string
  artifact_id: string
  artifact_type: ArtifactType
  title: string
  summary: string | null
  source_url: string | null
  source_owner: string | null
  source_repo: string | null
  license: string
  score_total: number
  quality_scores: QualityScores | null
  risk_flags: string[] | null
  tags: string[] | null
  evidence_snippets: string[] | null
  readme_content: string | null
  meta: Record<string, unknown> | null
  status: ArtifactStatus
  curation_notes: string | null
  promoted_pattern_id: number | null
  created_at: string
  updated_at: string
}

export interface ArtifactFilter {
  status?: ArtifactStatus
  artifact_type?: ArtifactType
  search?: string
  min_score?: number
  run_id?: string
}

export interface PipelineConfig {
  projectPath: string
  pythonPath?: string
}
