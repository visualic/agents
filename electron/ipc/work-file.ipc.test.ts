// @TASK P1-R4-T1 - Work Files IPC Handler Tests
// @SPEC docs/planning - work_files table CRUD + file content read

import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  getWorkFilesByWorkId,
  createWorkFile,
  updateWorkFile,
  deleteWorkFile,
  readWorkFileContent
} from './work-file.ipc'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

/** Insert a work row so FK constraints are satisfied. */
function seedWork(db: Database.Database): void {
  db.prepare(
    `INSERT INTO works (name, type) VALUES (?, ?)`
  ).run('Test Skill', 'skill')
}

/** Insert sample work files for work_id=1. */
function seedWorkFiles(db: Database.Database): void {
  db.prepare(
    `INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`
  ).run(1, 'SKILL.md', '/path/to/SKILL.md', 'skill_md')
  db.prepare(
    `INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`
  ).run(1, 'reference.md', '/path/to/reference.md', 'reference')
  db.prepare(
    `INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`
  ).run(1, 'config.json', '/path/to/config.json', 'config')
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

describe('Work Files IPC Handlers', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    db = createTestDb()
    seedWork(db)
    tmpDir = mkdtempSync(join(tmpdir(), 'skillforge-workfile-test-'))
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // --------------------------------------------------
  // work-file:get-by-work-id
  // --------------------------------------------------
  describe('getWorkFilesByWorkId', () => {
    it('should return empty array when no files exist for the work', () => {
      const result = getWorkFilesByWorkId(db, 1)
      expect(result).toEqual([])
    })

    it('should return all files for a given work_id', () => {
      seedWorkFiles(db)
      const result = getWorkFilesByWorkId(db, 1)

      expect(result).toHaveLength(3)
      const fileNames = result.map((f) => f.file_name)
      expect(fileNames).toContain('SKILL.md')
      expect(fileNames).toContain('reference.md')
      expect(fileNames).toContain('config.json')
    })

    it('should return correct fields for each file', () => {
      seedWorkFiles(db)
      const result = getWorkFilesByWorkId(db, 1)
      const skillFile = result.find((f) => f.file_name === 'SKILL.md')

      expect(skillFile).toBeDefined()
      expect(skillFile!.id).toBe(1)
      expect(skillFile!.work_id).toBe(1)
      expect(skillFile!.file_name).toBe('SKILL.md')
      expect(skillFile!.file_path).toBe('/path/to/SKILL.md')
      expect(skillFile!.file_type).toBe('skill_md')
    })

    it('should not return files belonging to a different work', () => {
      seedWorkFiles(db)

      // Create a second work with its own file
      db.prepare(`INSERT INTO works (name, type) VALUES (?, ?)`).run('Other Work', 'agent')
      db.prepare(
        `INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`
      ).run(2, 'agent.md', '/path/to/agent.md', 'agent_md')

      const filesForWork1 = getWorkFilesByWorkId(db, 1)
      const filesForWork2 = getWorkFilesByWorkId(db, 2)

      expect(filesForWork1).toHaveLength(3)
      expect(filesForWork2).toHaveLength(1)
      expect(filesForWork2[0].file_name).toBe('agent.md')
    })

    it('should return empty array for non-existent work_id', () => {
      const result = getWorkFilesByWorkId(db, 999)
      expect(result).toEqual([])
    })
  })

  // --------------------------------------------------
  // work-file:create
  // --------------------------------------------------
  describe('createWorkFile', () => {
    it('should create a work file and return it', () => {
      const result = createWorkFile(db, {
        work_id: 1,
        file_name: 'SKILL.md',
        file_path: '/path/to/SKILL.md',
        file_type: 'skill_md'
      })

      expect(result).toMatchObject({
        id: expect.any(Number),
        work_id: 1,
        file_name: 'SKILL.md',
        file_path: '/path/to/SKILL.md',
        file_type: 'skill_md'
      })
    })

    it('should create files with all valid file_type values', () => {
      const types = ['skill_md', 'agent_md', 'reference', 'config'] as const

      for (const fileType of types) {
        const result = createWorkFile(db, {
          work_id: 1,
          file_name: `${fileType}-file.md`,
          file_path: `/path/${fileType}-file.md`,
          file_type: fileType
        })
        expect(result.file_type).toBe(fileType)
      }
    })

    it('should throw when file_name is empty', () => {
      expect(() =>
        createWorkFile(db, {
          work_id: 1,
          file_name: '',
          file_path: '/path/to/file.md',
          file_type: 'skill_md'
        })
      ).toThrow('file_name is required')
    })

    it('should throw when file_path is empty', () => {
      expect(() =>
        createWorkFile(db, {
          work_id: 1,
          file_name: 'SKILL.md',
          file_path: '',
          file_type: 'skill_md'
        })
      ).toThrow('file_path is required')
    })

    it('should throw for invalid file_type', () => {
      expect(() =>
        createWorkFile(db, {
          work_id: 1,
          file_name: 'bad.md',
          file_path: '/path/bad.md',
          file_type: 'invalid' as never
        })
      ).toThrow()
    })

    it('should throw when work_id references non-existent work (FK constraint)', () => {
      expect(() =>
        createWorkFile(db, {
          work_id: 999,
          file_name: 'orphan.md',
          file_path: '/path/orphan.md',
          file_type: 'skill_md'
        })
      ).toThrow()
    })

    it('should allow multiple files for the same work', () => {
      createWorkFile(db, {
        work_id: 1,
        file_name: 'file1.md',
        file_path: '/path/file1.md',
        file_type: 'skill_md'
      })
      createWorkFile(db, {
        work_id: 1,
        file_name: 'file2.md',
        file_path: '/path/file2.md',
        file_type: 'reference'
      })

      const files = getWorkFilesByWorkId(db, 1)
      expect(files).toHaveLength(2)
    })
  })

  // --------------------------------------------------
  // work-file:update
  // --------------------------------------------------
  describe('updateWorkFile', () => {
    beforeEach(() => {
      seedWorkFiles(db)
    })

    it('should update file_name', () => {
      const result = updateWorkFile(db, 1, { file_name: 'UPDATED.md' })

      expect(result).toBeDefined()
      expect(result!.file_name).toBe('UPDATED.md')
    })

    it('should update file_path', () => {
      const result = updateWorkFile(db, 1, { file_path: '/new/path/SKILL.md' })

      expect(result).toBeDefined()
      expect(result!.file_path).toBe('/new/path/SKILL.md')
    })

    it('should update file_type', () => {
      const result = updateWorkFile(db, 1, { file_type: 'agent_md' })

      expect(result).toBeDefined()
      expect(result!.file_type).toBe('agent_md')
    })

    it('should update multiple fields at once', () => {
      const result = updateWorkFile(db, 1, {
        file_name: 'renamed.md',
        file_path: '/new/renamed.md',
        file_type: 'config'
      })

      expect(result!.file_name).toBe('renamed.md')
      expect(result!.file_path).toBe('/new/renamed.md')
      expect(result!.file_type).toBe('config')
    })

    it('should not modify other fields when updating specific ones', () => {
      const result = updateWorkFile(db, 1, { file_name: 'UPDATED.md' })

      expect(result!.file_path).toBe('/path/to/SKILL.md')
      expect(result!.file_type).toBe('skill_md')
      expect(result!.work_id).toBe(1)
    })

    it('should return null for non-existent id', () => {
      const result = updateWorkFile(db, 999, { file_name: 'ghost.md' })
      expect(result).toBeNull()
    })

    it('should throw when no fields provided', () => {
      expect(() => updateWorkFile(db, 1, {})).toThrow('No fields provided for update')
    })

    it('should throw for invalid file_type update', () => {
      expect(() =>
        updateWorkFile(db, 1, { file_type: 'invalid' as never })
      ).toThrow()
    })
  })

  // --------------------------------------------------
  // work-file:delete
  // --------------------------------------------------
  describe('deleteWorkFile', () => {
    beforeEach(() => {
      seedWorkFiles(db)
    })

    it('should delete a file and return true', () => {
      const result = deleteWorkFile(db, 1)

      expect(result).toBe(true)

      const files = getWorkFilesByWorkId(db, 1)
      expect(files).toHaveLength(2) // 3 - 1 = 2
    })

    it('should return false for non-existent id', () => {
      const result = deleteWorkFile(db, 999)
      expect(result).toBe(false)
    })

    it('should not affect other files', () => {
      deleteWorkFile(db, 1)

      const files = getWorkFilesByWorkId(db, 1)
      const fileNames = files.map((f) => f.file_name)
      expect(fileNames).not.toContain('SKILL.md')
      expect(fileNames).toContain('reference.md')
      expect(fileNames).toContain('config.json')
    })
  })

  // --------------------------------------------------
  // work-file:read-content
  // --------------------------------------------------
  describe('readWorkFileContent', () => {
    it('should read content from a file on disk', () => {
      const filePath = join(tmpDir, 'test.md')
      writeFileSync(filePath, '# Hello World\n\nThis is test content.', 'utf-8')

      const result = readWorkFileContent(filePath)

      expect(result.success).toBe(true)
      expect(result.content).toBe('# Hello World\n\nThis is test content.')
      expect(result.error).toBeUndefined()
    })

    it('should handle empty files', () => {
      const filePath = join(tmpDir, 'empty.md')
      writeFileSync(filePath, '', 'utf-8')

      const result = readWorkFileContent(filePath)

      expect(result.success).toBe(true)
      expect(result.content).toBe('')
    })

    it('should handle unicode content', () => {
      const filePath = join(tmpDir, 'unicode.md')
      const content = '# Skills\n\nKorean: \uD55C\uAD6D\uC5B4\nJapanese: \u65E5\u672C\u8A9E'
      writeFileSync(filePath, content, 'utf-8')

      const result = readWorkFileContent(filePath)

      expect(result.success).toBe(true)
      expect(result.content).toBe(content)
    })

    it('should return error for non-existent file', () => {
      const result = readWorkFileContent(join(tmpDir, 'nonexistent.md'))

      expect(result.success).toBe(false)
      expect(result.content).toBeUndefined()
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
    })

    it('should return error for invalid path', () => {
      const result = readWorkFileContent('/invalid\0path/file.md')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // --------------------------------------------------
  // Cascade delete (works -> work_files)
  // --------------------------------------------------
  describe('cascade delete via works', () => {
    it('should delete work_files when parent work is deleted', () => {
      seedWorkFiles(db)

      // Verify files exist
      expect(getWorkFilesByWorkId(db, 1)).toHaveLength(3)

      // Delete the parent work
      db.prepare('DELETE FROM works WHERE id = ?').run(1)

      // Files should be cascade-deleted
      const files = db.prepare('SELECT * FROM work_files WHERE work_id = ?').all(1)
      expect(files).toHaveLength(0)
    })
  })
})
