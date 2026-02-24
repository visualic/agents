// @TASK P5-R1-T4 - Discovery IPC Handlers
// @SPEC docs/planning - Discovery feature: config, pipeline, artifacts CRUD, promote

import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { getDatabase } from '../db/index'
import { validateProjectPath, runFullPipeline, runAutoReview, checkPipelineSetup, abortPipeline } from './pipeline'
import { importRunResults } from './artifact-parser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArtifactRow {
  id: number
  run_id: string
  artifact_id: string
  artifact_type: string
  title: string
  summary: string | null
  source_url: string | null
  source_owner: string | null
  source_repo: string | null
  license: string
  score_total: number
  quality_scores: string | null
  risk_flags: string | null
  tags: string | null
  evidence_snippets: string | null
  readme_content: string | null
  meta: string | null
  status: string
  curation_notes: string | null
  promoted_pattern_id: number | null
  created_at: string
  updated_at: string
}

export interface ArtifactFilters {
  status?: string
  artifact_type?: string
  search?: string
  min_score?: number
  run_id?: string
}

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * Parse JSON string fields in an artifact row for frontend consumption.
 */
export function parseArtifactRow(row: ArtifactRow) {
  return {
    ...row,
    quality_scores: row.quality_scores ? JSON.parse(row.quality_scores) : null,
    risk_flags: row.risk_flags ? JSON.parse(row.risk_flags) : null,
    tags: row.tags ? JSON.parse(row.tags) : null,
    evidence_snippets: row.evidence_snippets ? JSON.parse(row.evidence_snippets) : null,
    meta: row.meta ? JSON.parse(row.meta) : null
  }
}

/**
 * Get pipeline config from settings table.
 */
export function getConfig(db: Database.Database): { projectPath: string; pythonPath?: string } | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('discovery_project_path') as
    | { value: string }
    | undefined
  if (!row) return null

  const pythonRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('discovery_python_path') as
    | { value: string }
    | undefined

  return {
    projectPath: row.value,
    pythonPath: pythonRow?.value
  }
}

/**
 * Save pipeline config to settings table.
 */
export function setConfig(
  db: Database.Database,
  config: { projectPath: string; pythonPath?: string }
): void {
  const upsert = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
  upsert.run('discovery_project_path', config.projectPath)
  if (config.pythonPath) {
    upsert.run('discovery_python_path', config.pythonPath)
  }
}

/**
 * Get distinct run IDs from artifacts table.
 */
export function getRuns(db: Database.Database): string[] {
  const rows = db
    .prepare('SELECT run_id FROM artifacts GROUP BY run_id ORDER BY MAX(created_at) DESC')
    .all() as { run_id: string }[]
  return rows.map((r) => r.run_id)
}

/**
 * Get artifacts with optional filters.
 */
export function getArtifacts(db: Database.Database, filters?: ArtifactFilters): ArtifactRow[] {
  let sql = 'SELECT * FROM artifacts WHERE 1=1'
  const params: unknown[] = []

  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters?.artifact_type) {
    sql += ' AND artifact_type = ?'
    params.push(filters.artifact_type)
  }
  if (filters?.search) {
    sql += ' AND (title LIKE ? OR summary LIKE ?)'
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }
  if (filters?.min_score !== undefined) {
    sql += ' AND score_total >= ?'
    params.push(filters.min_score)
  }
  if (filters?.run_id) {
    sql += ' AND run_id = ?'
    params.push(filters.run_id)
  }

  sql += ' ORDER BY score_total DESC, created_at DESC'

  const rows = db.prepare(sql).all(...params) as ArtifactRow[]
  return rows.map(parseArtifactRow)
}

/**
 * Get single artifact by ID.
 */
export function getArtifact(db: Database.Database, id: number): ArtifactRow | null {
  const row = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as ArtifactRow | undefined
  if (!row) return null
  return parseArtifactRow(row) as ArtifactRow
}

/**
 * Update artifact status to 'verified'.
 */
export function verifyArtifact(db: Database.Database, id: number, notes?: string): boolean {
  const sql = `UPDATE artifacts SET status = 'verified', curation_notes = ?, updated_at = datetime('now') WHERE id = ?`
  const info = db.prepare(sql).run(notes || null, id)
  return info.changes > 0
}

/**
 * Update artifact status to 'rejected'.
 */
export function rejectArtifact(db: Database.Database, id: number, notes?: string): boolean {
  const sql = `UPDATE artifacts SET status = 'rejected', curation_notes = ?, updated_at = datetime('now') WHERE id = ?`
  const info = db.prepare(sql).run(notes || null, id)
  return info.changes > 0
}

/**
 * Promote artifact to a Pattern.
 * Creates a pattern from the artifact, links tags, updates artifact status.
 */
export function promoteArtifact(db: Database.Database, id: number): { patternId: number } | null {
  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as ArtifactRow | undefined
  if (!artifact) return null

  const promote = db.transaction(() => {
    // Map artifact_type to pattern type
    const patternType = ['skill', 'agent', 'orchestration'].includes(artifact.artifact_type)
      ? artifact.artifact_type
      : 'skill'

    // Create pattern
    const patternInfo = db.prepare(`
      INSERT INTO patterns (name, type, description, source, source_url, file_path)
      VALUES (?, ?, ?, 'external', ?, ?)
    `).run(
      artifact.title,
      patternType,
      artifact.summary,
      artifact.source_url,
      artifact.source_url || `discovered/${artifact.artifact_id}`
    )

    const patternId = patternInfo.lastInsertRowid as number

    // Link tags if present
    if (artifact.tags) {
      const parsedTags: string[] = typeof artifact.tags === 'string'
        ? JSON.parse(artifact.tags)
        : artifact.tags as unknown as string[]

      for (const tagName of parsedTags) {
        // Find or create tag
        let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number } | undefined
        if (!tag) {
          const tagInfo = db.prepare('INSERT INTO tags (name, category) VALUES (?, ?)').run(tagName, 'discovered')
          tag = { id: tagInfo.lastInsertRowid as number }
        }
        db.prepare('INSERT OR IGNORE INTO pattern_tags (pattern_id, tag_id) VALUES (?, ?)').run(patternId, tag.id)
      }
    }

    // Update artifact
    db.prepare(
      `UPDATE artifacts SET status = 'promoted', promoted_pattern_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(patternId, id)

    return patternId
  })

  const patternId = promote()
  return { patternId }
}

/**
 * Delete an artifact.
 */
export function deleteArtifact(db: Database.Database, id: number): boolean {
  const info = db.prepare('DELETE FROM artifacts WHERE id = ?').run(id)
  return info.changes > 0
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all discovery-related IPC handlers.
 * Accepts a getter function so handlers always reference the current window.
 */
export function registerDiscoveryHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('discovery:get-config', () => {
    return getConfig(getDatabase())
  })

  ipcMain.handle('discovery:set-config', (_event: unknown, config: { projectPath: string; pythonPath?: string }) => {
    const validation = validateProjectPath(config.projectPath)
    if (!validation.ok) throw new Error(validation.error)
    setConfig(getDatabase(), config)
    return { ok: true }
  })

  ipcMain.handle('discovery:check-setup', async () => {
    const config = getConfig(getDatabase())
    if (!config) return { ok: false, error: 'No project path configured' }
    return checkPipelineSetup(config)
  })

  ipcMain.handle('discovery:run-pipeline', async () => {
    const config = getConfig(getDatabase())
    if (!config) throw new Error('No project path configured')
    const result = await runFullPipeline(config, getMainWindow())
    if (result.success) {
      importRunResults(getDatabase(), config.projectPath, result.runId)
    }
    return result
  })

  ipcMain.handle('discovery:run-review', async (_event: unknown, runId: string) => {
    const config = getConfig(getDatabase())
    if (!config) throw new Error('No project path configured')
    const result = await runAutoReview(config, runId, getMainWindow())
    if (result.success) {
      importRunResults(getDatabase(), config.projectPath, runId)
    }
    return result
  })

  ipcMain.handle('discovery:get-runs', () => {
    return getRuns(getDatabase())
  })

  ipcMain.handle('discovery:get-artifacts', (_event: unknown, filters?: ArtifactFilters) => {
    return getArtifacts(getDatabase(), filters)
  })

  ipcMain.handle('discovery:get-artifact', (_event: unknown, id: number) => {
    return getArtifact(getDatabase(), id)
  })

  ipcMain.handle('discovery:verify', (_event: unknown, id: number, notes?: string) => {
    return verifyArtifact(getDatabase(), id, notes)
  })

  ipcMain.handle('discovery:reject', (_event: unknown, id: number, notes?: string) => {
    return rejectArtifact(getDatabase(), id, notes)
  })

  ipcMain.handle('discovery:promote', (_event: unknown, id: number) => {
    return promoteArtifact(getDatabase(), id)
  })

  ipcMain.handle('discovery:delete', (_event: unknown, id: number) => {
    return deleteArtifact(getDatabase(), id)
  })

  ipcMain.handle('discovery:import-run', (_event: unknown, runId: string) => {
    const config = getConfig(getDatabase())
    if (!config) throw new Error('No project path configured')
    return importRunResults(getDatabase(), config.projectPath, runId)
  })

  ipcMain.handle('discovery:abort', () => {
    abortPipeline()
  })
}
