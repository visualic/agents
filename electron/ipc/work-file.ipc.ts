// @TASK P1-R4-T1 - Work Files IPC Handlers
// @SPEC docs/planning - work_files table CRUD + file content read
// @TEST electron/ipc/work-file.ipc.test.ts

import type Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { ipcMain } from 'electron'
import { getDatabase } from '../db/index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkFile {
  id: number
  work_id: number
  file_name: string
  file_path: string
  file_type: 'skill_md' | 'agent_md' | 'reference' | 'config'
}

export interface CreateWorkFileInput {
  work_id: number
  file_name: string
  file_path: string
  file_type: string
}

export interface UpdateWorkFileInput {
  file_name?: string
  file_path?: string
  file_type?: string
}

export interface ReadContentResult {
  success: boolean
  content?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * work-file:get-by-work-id - Get all files belonging to a work.
 * Returns an empty array if no files exist or work_id does not exist.
 */
export function getWorkFilesByWorkId(
  db: Database.Database,
  workId: number
): WorkFile[] {
  return db
    .prepare('SELECT * FROM work_files WHERE work_id = ?')
    .all(workId) as WorkFile[]
}

/**
 * work-file:create - Insert a new work file metadata record.
 * Validates file_name and file_path are non-empty.
 * Relies on SQLite CHECK constraint for file_type validation
 * and FK constraint for work_id validation.
 */
export function createWorkFile(
  db: Database.Database,
  input: CreateWorkFileInput
): WorkFile {
  // Layer 2: Domain validation
  if (!input.file_name || input.file_name.trim() === '') {
    throw new Error('file_name is required')
  }
  if (!input.file_path || input.file_path.trim() === '') {
    throw new Error('file_path is required')
  }

  const sql = `
    INSERT INTO work_files (work_id, file_name, file_path, file_type)
    VALUES (?, ?, ?, ?)
  `
  const info = db.prepare(sql).run(
    input.work_id,
    input.file_name,
    input.file_path,
    input.file_type
  )

  return db
    .prepare('SELECT * FROM work_files WHERE id = ?')
    .get(info.lastInsertRowid as number) as WorkFile
}

/**
 * work-file:update - Update a work file's metadata fields.
 * Dynamically builds SET clause from provided fields.
 * Returns the updated row, or null if file not found.
 * Throws if no fields are provided.
 */
export function updateWorkFile(
  db: Database.Database,
  id: number,
  data: UpdateWorkFileInput
): WorkFile | null {
  const allowedFields = ['file_name', 'file_path', 'file_type'] as const
  const setClauses: string[] = []
  const params: unknown[] = []

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = ?`)
      params.push(data[field])
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No fields provided for update')
  }

  params.push(id)
  const sql = `UPDATE work_files SET ${setClauses.join(', ')} WHERE id = ?`
  const info = db.prepare(sql).run(...params)

  if (info.changes === 0) {
    return null
  }

  return db
    .prepare('SELECT * FROM work_files WHERE id = ?')
    .get(id) as WorkFile
}

/**
 * work-file:delete - Delete a work file record by id.
 * Returns true if deleted, false if not found.
 */
export function deleteWorkFile(db: Database.Database, id: number): boolean {
  const info = db.prepare('DELETE FROM work_files WHERE id = ?').run(id)
  return info.changes > 0
}

/**
 * work-file:read-content - Read file content from disk.
 * Returns success/error result (never throws).
 * Uses fs.readFileSync with utf-8 encoding.
 */
export function readWorkFileContent(filePath: string): ReadContentResult {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all work-file-related IPC handlers.
 * Called during app initialization in main.ts.
 *
 * Channels:
 *   work-file:get-by-work-id - List files for a work
 *   work-file:create         - Create file metadata record
 *   work-file:update         - Update file metadata
 *   work-file:delete         - Delete file record
 *   work-file:read-content   - Read file content from disk
 */
export function registerWorkFileHandlers(): void {
  const db = getDatabase()

  ipcMain.handle('work-file:get-by-work-id', (_event, workId: number) => {
    return getWorkFilesByWorkId(db, workId)
  })

  ipcMain.handle(
    'work-file:create',
    (_event, input: CreateWorkFileInput) => {
      return createWorkFile(db, input)
    }
  )

  ipcMain.handle(
    'work-file:update',
    (_event, id: number, data: UpdateWorkFileInput) => {
      return updateWorkFile(db, id, data)
    }
  )

  ipcMain.handle('work-file:delete', (_event, id: number) => {
    return deleteWorkFile(db, id)
  })

  ipcMain.handle('work-file:read-content', (_event, filePath: string) => {
    return readWorkFileContent(filePath)
  })
}
