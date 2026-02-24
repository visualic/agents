// @TASK P5-R1-T3 - JSONL Parser + Artifact Importer

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import type Database from 'better-sqlite3'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportResult {
  curated: number
  review: number
  total: number
}

export interface GeneratedSkill {
  slug: string
  skillMd: string
  sourceMd: string
}

export interface GeneratedSubagent {
  slug: string
  content: string
}

export interface GeneratedOrchestration {
  slug: string
  manifest: Record<string, unknown>
}

export interface GeneratedAssets {
  skills: GeneratedSkill[]
  subagents: GeneratedSubagent[]
  orchestrations: GeneratedOrchestration[]
}

// ---------------------------------------------------------------------------
// Pure functions (testable)
// ---------------------------------------------------------------------------

/**
 * Parse a JSONL file into an array of objects.
 * Each line is a JSON object. Blank lines and parse errors are skipped.
 */
export function readJsonlFile(filePath: string): Record<string, unknown>[] {
  if (!existsSync(filePath)) return []

  const content = readFileSync(filePath, 'utf-8')
  const results: Record<string, unknown>[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      results.push(JSON.parse(trimmed))
    } catch {
      // skip malformed lines
    }
  }

  return results
}

/**
 * Map a raw JSONL artifact record to DB insert params.
 */
function mapArtifactToRow(raw: Record<string, unknown>, runId: string, status: string) {
  return {
    run_id: runId,
    artifact_id: String(raw.id || raw.artifact_id || ''),
    artifact_type: mapArtifactType(String(raw.type || raw.artifact_type || 'reference')),
    title: String(raw.title || raw.name || raw.repo || ''),
    summary: raw.summary ? String(raw.summary) : null,
    source_url: raw.source_url || raw.url ? String(raw.source_url || raw.url) : null,
    source_owner: raw.owner ? String(raw.owner) : null,
    source_repo: raw.repo ? String(raw.repo) : null,
    license: raw.license ? String(raw.license) : 'UNKNOWN',
    score_total: typeof raw.score_total === 'number' ? raw.score_total :
                 typeof raw.total_score === 'number' ? raw.total_score : 0,
    quality_scores: raw.quality_scores || raw.scores ? JSON.stringify(raw.quality_scores || raw.scores) : null,
    risk_flags: raw.risk_flags ? JSON.stringify(raw.risk_flags) : null,
    tags: raw.tags ? JSON.stringify(raw.tags) : null,
    evidence_snippets: raw.evidence_snippets || raw.evidence ? JSON.stringify(raw.evidence_snippets || raw.evidence) : null,
    readme_content: raw.readme_content || raw.readme ? String(raw.readme_content || raw.readme) : null,
    meta: raw.meta ? JSON.stringify(raw.meta) : null,
    status,
    curation_notes: raw.curation_notes ? String(raw.curation_notes) : null
  }
}

/**
 * Normalize artifact type string to valid enum.
 */
function mapArtifactType(raw: string): string {
  const normalized = raw.toLowerCase()
  if (['skill', 'agent', 'orchestration', 'tooling', 'reference'].includes(normalized)) {
    return normalized
  }
  if (normalized === 'subagent') return 'agent'
  return 'reference'
}

/**
 * Import agents-casting run results into the artifacts table.
 * Reads curated and review JSONL files.
 */
export function importRunResults(
  db: Database.Database,
  projectPath: string,
  runId: string
): ImportResult {
  const curatedPath = join(projectPath, 'data', 'curated', runId, 'artifacts.curated.jsonl')
  const reviewPath = join(projectPath, 'data', 'curated', runId, 'artifacts.review.jsonl')

  const curatedRecords = readJsonlFile(curatedPath)
  const reviewRecords = readJsonlFile(reviewPath)

  const insertSql = `
    INSERT OR REPLACE INTO artifacts (
      run_id, artifact_id, artifact_type, title, summary,
      source_url, source_owner, source_repo, license,
      score_total, quality_scores, risk_flags, tags,
      evidence_snippets, readme_content, meta,
      status, curation_notes
    ) VALUES (
      @run_id, @artifact_id, @artifact_type, @title, @summary,
      @source_url, @source_owner, @source_repo, @license,
      @score_total, @quality_scores, @risk_flags, @tags,
      @evidence_snippets, @readme_content, @meta,
      @status, @curation_notes
    )
  `
  const insert = db.prepare(insertSql)

  const importAll = db.transaction(() => {
    for (const raw of curatedRecords) {
      const row = mapArtifactToRow(raw, runId, 'curated')
      if (row.artifact_id) insert.run(row)
    }
    for (const raw of reviewRecords) {
      const row = mapArtifactToRow(raw, runId, 'review')
      if (row.artifact_id) insert.run(row)
    }
  })

  importAll()

  return {
    curated: curatedRecords.length,
    review: reviewRecords.length,
    total: curatedRecords.length + reviewRecords.length
  }
}

/**
 * Read generated assets (skills, subagents, orchestrations) from a run.
 */
export function readGeneratedAssets(projectPath: string, runId: string): GeneratedAssets {
  const genBase = join(projectPath, 'generated', runId)
  const result: GeneratedAssets = { skills: [], subagents: [], orchestrations: [] }

  // Skills: generated/{runId}/skills/*/SKILL.md
  const skillsDir = join(genBase, 'skills')
  if (existsSync(skillsDir)) {
    for (const slug of readdirSync(skillsDir)) {
      const skillMdPath = join(skillsDir, slug, 'SKILL.md')
      const sourceMdPath = join(skillsDir, slug, 'SOURCE.md')
      if (existsSync(skillMdPath)) {
        result.skills.push({
          slug,
          skillMd: readFileSync(skillMdPath, 'utf-8'),
          sourceMd: existsSync(sourceMdPath) ? readFileSync(sourceMdPath, 'utf-8') : ''
        })
      }
    }
  }

  // Subagents: generated/{runId}/subagents/*.md
  const subagentsDir = join(genBase, 'subagents')
  if (existsSync(subagentsDir)) {
    for (const file of readdirSync(subagentsDir)) {
      if (file.endsWith('.md')) {
        result.subagents.push({
          slug: file.replace('.md', ''),
          content: readFileSync(join(subagentsDir, file), 'utf-8')
        })
      }
    }
  }

  // Orchestrations: generated/{runId}/orchestrations/*.json
  const orchDir = join(genBase, 'orchestrations')
  if (existsSync(orchDir)) {
    for (const file of readdirSync(orchDir)) {
      if (file.endsWith('.json')) {
        try {
          const manifest = JSON.parse(readFileSync(join(orchDir, file), 'utf-8'))
          result.orchestrations.push({
            slug: file.replace('.json', ''),
            manifest
          })
        } catch {
          // skip malformed JSON
        }
      }
    }
  }

  return result
}
