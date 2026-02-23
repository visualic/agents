// @TASK P1-R2-T1 - Tags IPC 핸들러 구현
// @SPEC docs/planning/02-trd.md#태그-관리
// @TEST electron/ipc/tag.ipc.test.ts

import type Database from 'better-sqlite3'

// --- Types ---

export interface TagInput {
  name: string
  category?: string
}

export interface Tag {
  id: number
  name: string
  category: string | null
}

// --- Pure Functions (testable without Electron) ---

/**
 * 전체 태그 목록 조회. category -> name 순 정렬.
 */
export function getAllTags(db: Database.Database): Tag[] {
  return db.prepare('SELECT * FROM tags ORDER BY category, name').all() as Tag[]
}

/**
 * 태그 생성. UNIQUE name 제약 위반 시 SqliteError throw.
 */
export function createTag(
  db: Database.Database,
  data: TagInput
): { id: number; name: string; category?: string } {
  const result = db
    .prepare('INSERT INTO tags (name, category) VALUES (?, ?)')
    .run(data.name, data.category ?? null)

  return { id: Number(result.lastInsertRowid), ...data }
}

/**
 * 태그 삭제. pattern_tags는 ON DELETE CASCADE로 자동 삭제.
 */
export function deleteTag(
  db: Database.Database,
  id: number
): { changes: number } {
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id)
  return { changes: result.changes }
}

/**
 * 카테고리별 태그 조회. name 순 정렬.
 */
export function getTagsByCategory(db: Database.Database, category: string): Tag[] {
  return db
    .prepare('SELECT * FROM tags WHERE category = ? ORDER BY name')
    .all(category) as Tag[]
}

// --- IPC Handler Registration ---
// Note: Electron imports are deferred to avoid issues in test environments
// where the 'electron' module is not available.

/**
 * Electron ipcMain에 tag 관련 핸들러 등록.
 * main process 초기화 시 호출.
 */
export function registerTagHandlers(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ipcMain } = require('electron')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDatabase } = require('../db')

  ipcMain.handle('tag:get-all', () => getAllTags(getDatabase()))
  ipcMain.handle('tag:create', (_e: unknown, data: TagInput) => createTag(getDatabase(), data))
  ipcMain.handle('tag:delete', (_e: unknown, id: number) => deleteTag(getDatabase(), id))
  ipcMain.handle('tag:get-by-category', (_e: unknown, category: string) =>
    getTagsByCategory(getDatabase(), category)
  )
}
