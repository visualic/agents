// @TASK P1-R3-T1 - Works IPC 핸들러 구현
// @SPEC docs/planning - works 테이블 CRUD + 필터/검색/cascade 삭제
// @TEST electron/ipc/work.ipc.test.ts

import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import { getDatabase } from '../db/index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Work {
  id: number
  name: string
  type: 'skill' | 'agent' | 'orchestration'
  base_pattern_id: number | null
  status: 'draft' | 'completed' | 'exported'
  export_path: string | null
  created_at: string
  updated_at: string
}

export interface WorkFilters {
  status?: string
  type?: string
  search?: string
}

export interface CreateWorkInput {
  name: string
  type: string
  base_pattern_id?: number
}

export interface UpdateWorkInput {
  name?: string
  status?: string
  export_path?: string
}

// ---------------------------------------------------------------------------
// Pure Functions (testable without Electron IPC)
// ---------------------------------------------------------------------------

/**
 * Retrieve all works with optional filters.
 * Results are ordered by updated_at DESC.
 */
export function getAllWorks(db: Database.Database, filters?: WorkFilters): Work[] {
  let sql = 'SELECT * FROM works WHERE 1=1'
  const params: unknown[] = []

  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters?.type) {
    sql += ' AND type = ?'
    params.push(filters.type)
  }
  if (filters?.search) {
    sql += ' AND name LIKE ?'
    params.push(`%${filters.search}%`)
  }

  sql += ' ORDER BY updated_at DESC'

  return db.prepare(sql).all(...params) as Work[]
}

/**
 * Retrieve a single work by id.
 * Returns null if not found.
 */
export function getWorkById(db: Database.Database, id: number): Work | null {
  const row = db.prepare('SELECT * FROM works WHERE id = ?').get(id) as Work | undefined
  return row ?? null
}

/**
 * Create a new work.
 * Returns the newly created work row.
 */
export function createWork(db: Database.Database, input: CreateWorkInput): Work {
  const { name, type, base_pattern_id } = input

  const info = db
    .prepare(
      `INSERT INTO works (name, type, base_pattern_id) VALUES (?, ?, ?)`
    )
    .run(name, type, base_pattern_id ?? null)

  return getWorkById(db, info.lastInsertRowid as number) as Work
}

/**
 * Update an existing work.
 * Dynamically builds SET clause from provided fields.
 * Automatically sets updated_at to CURRENT_TIMESTAMP.
 * Throws if work not found or no fields provided.
 */
export function updateWork(
  db: Database.Database,
  id: number,
  data: UpdateWorkInput
): Work {
  const allowedFields = ['name', 'status', 'export_path'] as const
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

  // Always update the updated_at timestamp
  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  const sql = `UPDATE works SET ${setClauses.join(', ')} WHERE id = ?`
  const info = db.prepare(sql).run(...params)

  if (info.changes === 0) {
    throw new Error(`Work with id ${id} not found`)
  }

  return getWorkById(db, id) as Work
}

/**
 * Delete a work and cascade-delete related work_files and guide_sessions.
 * Uses a transaction to ensure all-or-nothing behavior.
 */
export function deleteWork(db: Database.Database, id: number): void {
  const del = db.transaction((workId: number) => {
    db.prepare('DELETE FROM guide_sessions WHERE work_id = ?').run(workId)
    db.prepare('DELETE FROM work_files WHERE work_id = ?').run(workId)
    db.prepare('DELETE FROM works WHERE id = ?').run(workId)
  })

  del(id)
}

// ---------------------------------------------------------------------------
// IPC Registration (called from main process)
// ---------------------------------------------------------------------------

export function registerWorkIpcHandlers(): void {
  const db = getDatabase()

  ipcMain.handle('work:get-all', (_event, filters?: WorkFilters) => {
    return getAllWorks(db, filters)
  })

  ipcMain.handle('work:get-by-id', (_event, id: number) => {
    return getWorkById(db, id)
  })

  ipcMain.handle(
    'work:create',
    (_event, input: CreateWorkInput) => {
      return createWork(db, input)
    }
  )

  ipcMain.handle(
    'work:update',
    (_event, id: number, data: UpdateWorkInput) => {
      return updateWork(db, id, data)
    }
  )

  ipcMain.handle('work:delete', (_event, id: number) => {
    deleteWork(db, id)
    return { success: true }
  })
}
