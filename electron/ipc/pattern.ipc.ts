// @TASK P1-R1-T1 - Patterns IPC Handlers
// @SPEC docs/planning/02-trd.md#patterns-api
// @TEST electron/ipc/pattern.ipc.test.ts

import Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import { getDatabase } from '../db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatternRow {
  id: number
  name: string
  type: 'skill' | 'agent' | 'orchestration'
  description: string | null
  source: 'internal' | 'external'
  source_url: string | null
  structure_preview: string | null
  file_path: string
  tag_names: string | null
  created_at: string
  updated_at: string
}

export interface CreatePatternInput {
  name: string
  type: 'skill' | 'agent' | 'orchestration'
  description?: string | null
  source: 'internal' | 'external'
  source_url?: string | null
  structure_preview?: string | null
  file_path: string
  tag_ids?: number[]
}

export interface UpdatePatternInput {
  name?: string
  type?: 'skill' | 'agent' | 'orchestration'
  description?: string | null
  source?: 'internal' | 'external'
  source_url?: string | null
  structure_preview?: string | null
  file_path?: string
  tag_ids?: number[]
}

export interface PatternFilters {
  type?: string
  search?: string
}

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * pattern:get-all - List patterns with optional type filter and search.
 * Returns patterns with tags joined via GROUP_CONCAT.
 * Ordered by updated_at DESC.
 */
export function getPatterns(
  db: Database.Database,
  filters?: PatternFilters
): PatternRow[] {
  let sql = `
    SELECT p.*, GROUP_CONCAT(t.name) as tag_names
    FROM patterns p
    LEFT JOIN pattern_tags pt ON p.id = pt.pattern_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filters?.type) {
    sql += ' AND p.type = ?'
    params.push(filters.type)
  }
  if (filters?.search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }

  sql += ' GROUP BY p.id ORDER BY p.updated_at DESC'

  return db.prepare(sql).all(...params) as PatternRow[]
}

/**
 * pattern:get-by-id - Get a single pattern by id with tags.
 */
export function getPatternById(
  db: Database.Database,
  id: number
): PatternRow | undefined {
  const sql = `
    SELECT p.*, GROUP_CONCAT(t.name) as tag_names
    FROM patterns p
    LEFT JOIN pattern_tags pt ON p.id = pt.pattern_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.id = ?
    GROUP BY p.id
  `
  const row = db.prepare(sql).get(id) as PatternRow | undefined

  // When no pattern matches, SQLite still returns a row with all NULLs due to LEFT JOIN + GROUP BY.
  // Check if id is null to detect non-existent patterns.
  if (row && row.id === null) return undefined

  return row
}

/**
 * pattern:create - Insert a new pattern with optional tags.
 * Validates name and file_path are non-empty.
 */
export function createPattern(
  db: Database.Database,
  input: CreatePatternInput
): PatternRow {
  // Layer 2: Domain validation
  if (!input.name || input.name.trim() === '') {
    throw new Error('Pattern name is required')
  }
  if (!input.file_path || input.file_path.trim() === '') {
    throw new Error('Pattern file_path is required')
  }

  const insertSql = `
    INSERT INTO patterns (name, type, description, source, source_url, structure_preview, file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `

  const insertAndGetPattern = db.transaction(() => {
    const info = db.prepare(insertSql).run(
      input.name,
      input.type,
      input.description ?? null,
      input.source,
      input.source_url ?? null,
      input.structure_preview ?? null,
      input.file_path
    )

    const patternId = info.lastInsertRowid as number

    // Link tags if provided
    if (input.tag_ids && input.tag_ids.length > 0) {
      const tagInsert = db.prepare(
        'INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (?, ?)'
      )
      for (const tagId of input.tag_ids) {
        tagInsert.run(patternId, tagId)
      }
    }

    return patternId
  })

  const patternId = insertAndGetPattern()

  // Return the created pattern with tags
  return getPatternById(db, patternId)!
}

/**
 * pattern:update - Update a pattern's fields and optionally replace tags.
 * Returns the updated pattern or undefined if not found.
 */
export function updatePattern(
  db: Database.Database,
  id: number,
  input: UpdatePatternInput
): PatternRow | undefined {
  // Check pattern exists
  const existing = db.prepare('SELECT id FROM patterns WHERE id = ?').get(id)
  if (!existing) return undefined

  const performUpdate = db.transaction(() => {
    // Build dynamic UPDATE statement
    const setClauses: string[] = []
    const params: unknown[] = []

    if (input.name !== undefined) {
      setClauses.push('name = ?')
      params.push(input.name)
    }
    if (input.type !== undefined) {
      setClauses.push('type = ?')
      params.push(input.type)
    }
    if (input.description !== undefined) {
      setClauses.push('description = ?')
      params.push(input.description)
    }
    if (input.source !== undefined) {
      setClauses.push('source = ?')
      params.push(input.source)
    }
    if (input.source_url !== undefined) {
      setClauses.push('source_url = ?')
      params.push(input.source_url)
    }
    if (input.structure_preview !== undefined) {
      setClauses.push('structure_preview = ?')
      params.push(input.structure_preview)
    }
    if (input.file_path !== undefined) {
      setClauses.push('file_path = ?')
      params.push(input.file_path)
    }

    // Always update updated_at
    setClauses.push("updated_at = datetime('now')")

    if (setClauses.length > 0) {
      const updateSql = `UPDATE patterns SET ${setClauses.join(', ')} WHERE id = ?`
      params.push(id)
      db.prepare(updateSql).run(...params)
    }

    // Replace tags if provided
    if (input.tag_ids !== undefined) {
      db.prepare('DELETE FROM pattern_tags WHERE pattern_id = ?').run(id)

      if (input.tag_ids.length > 0) {
        const tagInsert = db.prepare(
          'INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (?, ?)'
        )
        for (const tagId of input.tag_ids) {
          tagInsert.run(id, tagId)
        }
      }
    }
  })

  performUpdate()

  return getPatternById(db, id)
}

/**
 * pattern:delete - Delete a pattern by id.
 * Returns true if deleted, false if not found.
 * pattern_tags are cascade-deleted by the FK constraint.
 */
export function deletePattern(db: Database.Database, id: number): boolean {
  const info = db.prepare('DELETE FROM patterns WHERE id = ?').run(id)
  return info.changes > 0
}

/**
 * pattern:search - Full-text search across name and description.
 * Case-insensitive via SQLite's default LIKE behavior.
 */
export function searchPatterns(
  db: Database.Database,
  query: string
): PatternRow[] {
  const sql = `
    SELECT p.*, GROUP_CONCAT(t.name) as tag_names
    FROM patterns p
    LEFT JOIN pattern_tags pt ON p.id = pt.pattern_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.name LIKE ? OR p.description LIKE ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `
  const likeParam = `%${query}%`
  return db.prepare(sql).all(likeParam, likeParam) as PatternRow[]
}

/**
 * pattern:get-related - Get patterns of the same type, excluding the given pattern.
 * Optionally limited to `limit` results (default: no limit).
 */
export function getRelatedPatterns(
  db: Database.Database,
  id: number,
  limit?: number
): PatternRow[] {
  // First, get the pattern's type
  const pattern = db
    .prepare('SELECT type FROM patterns WHERE id = ?')
    .get(id) as { type: string } | undefined

  if (!pattern) return []

  let sql = `
    SELECT p.*, GROUP_CONCAT(t.name) as tag_names
    FROM patterns p
    LEFT JOIN pattern_tags pt ON p.id = pt.pattern_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.type = ? AND p.id != ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `
  const params: unknown[] = [pattern.type, id]

  if (limit !== undefined && limit > 0) {
    sql += ' LIMIT ?'
    params.push(limit)
  }

  return db.prepare(sql).all(...params) as PatternRow[]
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all pattern-related IPC handlers.
 * Called during app initialization in main.ts.
 */
export function registerPatternHandlers(): void {
  ipcMain.handle('pattern:get-all', (_event, filters?: PatternFilters) => {
    return getPatterns(getDatabase(), filters)
  })

  ipcMain.handle('pattern:get-by-id', (_event, id: number) => {
    return getPatternById(getDatabase(), id)
  })

  ipcMain.handle('pattern:create', (_event, input: CreatePatternInput) => {
    return createPattern(getDatabase(), input)
  })

  ipcMain.handle('pattern:update', (_event, id: number, input: UpdatePatternInput) => {
    return updatePattern(getDatabase(), id, input)
  })

  ipcMain.handle('pattern:delete', (_event, id: number) => {
    return deletePattern(getDatabase(), id)
  })

  ipcMain.handle('pattern:search', (_event, query: string) => {
    return searchPatterns(getDatabase(), query)
  })

  ipcMain.handle('pattern:get-related', (_event, id: number, limit?: number) => {
    return getRelatedPatterns(getDatabase(), id, limit)
  })
}
