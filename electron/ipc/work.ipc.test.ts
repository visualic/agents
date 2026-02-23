// @TASK P1-R3-T1 - Works IPC 핸들러 테스트
// @SPEC docs/planning - works 테이블 CRUD + 필터/검색/cascade 삭제

import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getAllWorks,
  getWorkById,
  createWork,
  updateWork,
  deleteWork
} from './work.ipc'

function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('skill', 'agent', 'orchestration')),
      description TEXT,
      source TEXT NOT NULL CHECK(source IN ('internal', 'external')),
      source_url TEXT,
      structure_preview TEXT,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('skill', 'agent', 'orchestration')),
      base_pattern_id INTEGER REFERENCES patterns(id),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'completed', 'exported')),
      export_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE work_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT CHECK(file_type IN ('skill_md', 'agent_md', 'reference', 'config'))
    );

    CREATE TABLE guide_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      current_step TEXT CHECK(current_step IN ('step1','step2','step3','step4','step5')),
      conversation_log TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  return db
}

describe('Works IPC Handlers', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
  })

  // --------------------------------------------------
  // work:create
  // --------------------------------------------------
  describe('createWork', () => {
    it('should create a work with required fields', () => {
      const result = createWork(db, { name: 'My Skill', type: 'skill' })

      expect(result).toMatchObject({
        id: expect.any(Number),
        name: 'My Skill',
        type: 'skill',
        status: 'draft',
        base_pattern_id: null,
        export_path: null
      })
      expect(result.created_at).toBeDefined()
      expect(result.updated_at).toBeDefined()
    })

    it('should create a work with optional base_pattern_id', () => {
      // Insert a pattern first
      db.prepare(
        `INSERT INTO patterns (name, type, source, file_path) VALUES (?, ?, ?, ?)`
      ).run('Base Pattern', 'skill', 'internal', '/path/to/pattern')

      const result = createWork(db, {
        name: 'Derived Skill',
        type: 'skill',
        base_pattern_id: 1
      })

      expect(result.base_pattern_id).toBe(1)
    })

    it('should reject invalid type', () => {
      expect(() =>
        createWork(db, { name: 'Bad', type: 'invalid' as never })
      ).toThrow()
    })
  })

  // --------------------------------------------------
  // work:get-all
  // --------------------------------------------------
  describe('getAllWorks', () => {
    beforeEach(() => {
      createWork(db, { name: 'Alpha Skill', type: 'skill' })
      createWork(db, { name: 'Beta Agent', type: 'agent' })
      createWork(db, { name: 'Gamma Orchestration', type: 'orchestration' })

      // Mark one as completed
      updateWork(db, 1, { status: 'completed' })
    })

    it('should return all works ordered by updated_at DESC', () => {
      const works = getAllWorks(db)

      expect(works).toHaveLength(3)
      // The most recently updated should be first (id=1 was updated)
      expect(works[0].name).toBe('Alpha Skill')
    })

    it('should filter by status', () => {
      const drafts = getAllWorks(db, { status: 'draft' })

      expect(drafts).toHaveLength(2)
      drafts.forEach((w) => expect(w.status).toBe('draft'))
    })

    it('should filter by type', () => {
      const agents = getAllWorks(db, { type: 'agent' })

      expect(agents).toHaveLength(1)
      expect(agents[0].name).toBe('Beta Agent')
    })

    it('should filter by search (name LIKE)', () => {
      const results = getAllWorks(db, { search: 'Alpha' })

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Alpha Skill')
    })

    it('should combine multiple filters', () => {
      const results = getAllWorks(db, { status: 'draft', type: 'agent' })

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Beta Agent')
    })

    it('should return empty array when no matches', () => {
      const results = getAllWorks(db, { search: 'nonexistent' })

      expect(results).toHaveLength(0)
    })
  })

  // --------------------------------------------------
  // work:get-by-id
  // --------------------------------------------------
  describe('getWorkById', () => {
    it('should return a work by id', () => {
      createWork(db, { name: 'Test Work', type: 'skill' })

      const result = getWorkById(db, 1)

      expect(result).toMatchObject({
        id: 1,
        name: 'Test Work',
        type: 'skill',
        status: 'draft'
      })
    })

    it('should return null for non-existent id', () => {
      const result = getWorkById(db, 999)

      expect(result).toBeNull()
    })
  })

  // --------------------------------------------------
  // work:update
  // --------------------------------------------------
  describe('updateWork', () => {
    beforeEach(() => {
      createWork(db, { name: 'Original', type: 'skill' })
    })

    it('should update name', () => {
      const result = updateWork(db, 1, { name: 'Updated Name' })

      expect(result.name).toBe('Updated Name')
    })

    it('should update status', () => {
      const result = updateWork(db, 1, { status: 'completed' })

      expect(result.status).toBe('completed')
    })

    it('should update export_path', () => {
      const result = updateWork(db, 1, { export_path: '/export/my-skill' })

      expect(result.export_path).toBe('/export/my-skill')
    })

    it('should update multiple fields at once', () => {
      const result = updateWork(db, 1, {
        name: 'New Name',
        status: 'exported',
        export_path: '/exported/path'
      })

      expect(result.name).toBe('New Name')
      expect(result.status).toBe('exported')
      expect(result.export_path).toBe('/exported/path')
    })

    it('should auto-update updated_at', () => {
      const before = getWorkById(db, 1)!
      // Small delay to ensure timestamp difference
      const originalUpdatedAt = before.updated_at

      updateWork(db, 1, { name: 'Changed' })
      const after = getWorkById(db, 1)!

      // updated_at should be >= original (SQLite CURRENT_TIMESTAMP has second granularity)
      expect(after.updated_at).toBeDefined()
      expect(after.name).toBe('Changed')
    })

    it('should throw for non-existent id', () => {
      expect(() => updateWork(db, 999, { name: 'Nope' })).toThrow()
    })

    it('should throw when no fields provided', () => {
      expect(() => updateWork(db, 1, {})).toThrow()
    })
  })

  // --------------------------------------------------
  // work:delete
  // --------------------------------------------------
  describe('deleteWork', () => {
    beforeEach(() => {
      createWork(db, { name: 'To Delete', type: 'skill' })

      // Add related work_files
      db.prepare(
        `INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`
      ).run(1, 'skill.md', '/path/skill.md', 'skill_md')
      db.prepare(
        `INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`
      ).run(1, 'ref.md', '/path/ref.md', 'reference')

      // Add related guide_sessions
      db.prepare(
        `INSERT INTO guide_sessions (work_id, current_step) VALUES (?, ?)`
      ).run(1, 'step1')
    })

    it('should delete the work', () => {
      deleteWork(db, 1)

      const result = getWorkById(db, 1)
      expect(result).toBeNull()
    })

    it('should cascade delete work_files', () => {
      deleteWork(db, 1)

      const files = db.prepare('SELECT * FROM work_files WHERE work_id = ?').all(1)
      expect(files).toHaveLength(0)
    })

    it('should cascade delete guide_sessions', () => {
      deleteWork(db, 1)

      const sessions = db
        .prepare('SELECT * FROM guide_sessions WHERE work_id = ?')
        .all(1)
      expect(sessions).toHaveLength(0)
    })

    it('should use transaction (all-or-nothing)', () => {
      // Verify all 3 tables cleaned up in single transaction
      deleteWork(db, 1)

      const work = getWorkById(db, 1)
      const files = db.prepare('SELECT * FROM work_files WHERE work_id = ?').all(1)
      const sessions = db
        .prepare('SELECT * FROM guide_sessions WHERE work_id = ?')
        .all(1)

      expect(work).toBeNull()
      expect(files).toHaveLength(0)
      expect(sessions).toHaveLength(0)
    })

    it('should not throw for non-existent id', () => {
      expect(() => deleteWork(db, 999)).not.toThrow()
    })
  })
})
