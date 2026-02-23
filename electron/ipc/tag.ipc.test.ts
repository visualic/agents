// @TASK P1-R2-T1 - Tags IPC 핸들러 테스트
// @SPEC docs/planning/02-trd.md#태그-관리

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { getAllTags, createTag, deleteTag, getTagsByCategory } from './tag.ipc'

// In-memory DB with same schema as electron/db/index.ts
function createTestDatabase(): Database.Database {
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

    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT
    );

    CREATE TABLE pattern_tags (
      pattern_id INTEGER REFERENCES patterns(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (pattern_id, tag_id)
    );
  `)

  return db
}

describe('Tag IPC Handlers', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  // --- getAllTags ---

  describe('getAllTags', () => {
    it('should return empty array when no tags exist', () => {
      const result = getAllTags(db)
      expect(result).toEqual([])
    })

    it('should return all tags ordered by category then name', () => {
      db.exec(`
        INSERT INTO tags (name, category) VALUES ('zeta', 'b-cat');
        INSERT INTO tags (name, category) VALUES ('alpha', 'a-cat');
        INSERT INTO tags (name, category) VALUES ('beta', 'a-cat');
        INSERT INTO tags (name, category) VALUES ('gamma', 'b-cat');
      `)

      const result = getAllTags(db)
      expect(result).toHaveLength(4)
      expect(result.map((t: { name: string }) => t.name)).toEqual([
        'alpha',
        'beta',
        'gamma',
        'zeta'
      ])
    })

    it('should handle tags with null category (sorted last)', () => {
      db.exec(`
        INSERT INTO tags (name, category) VALUES ('with-cat', 'a-cat');
        INSERT INTO tags (name) VALUES ('no-cat');
      `)

      const result = getAllTags(db)
      expect(result).toHaveLength(2)
      // SQLite sorts NULL first in ORDER BY by default
      expect((result[0] as { name: string }).name).toBe('no-cat')
      expect((result[1] as { name: string }).name).toBe('with-cat')
    })
  })

  // --- createTag ---

  describe('createTag', () => {
    it('should create a tag with name and category', () => {
      const result = createTag(db, { name: 'typescript', category: 'language' })

      expect(result).toMatchObject({
        id: expect.any(Number),
        name: 'typescript',
        category: 'language'
      })

      // Verify in DB
      const rows = db.prepare('SELECT * FROM tags').all() as Array<{
        id: number
        name: string
        category: string | null
      }>
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('typescript')
      expect(rows[0].category).toBe('language')
    })

    it('should create a tag with null category when not provided', () => {
      const result = createTag(db, { name: 'misc-tag' })

      expect(result).toMatchObject({
        id: expect.any(Number),
        name: 'misc-tag'
      })
      expect(result.category).toBeUndefined()

      // Verify DB stores NULL
      const row = db.prepare('SELECT * FROM tags WHERE name = ?').get('misc-tag') as {
        category: string | null
      }
      expect(row.category).toBeNull()
    })

    it('should throw error on duplicate tag name (UNIQUE constraint)', () => {
      createTag(db, { name: 'unique-tag', category: 'test' })

      expect(() => {
        createTag(db, { name: 'unique-tag', category: 'other' })
      }).toThrow(/UNIQUE constraint failed/)
    })

    it('should return numeric id (not bigint)', () => {
      const result = createTag(db, { name: 'test-tag' })
      expect(typeof result.id).toBe('number')
    })
  })

  // --- deleteTag ---

  describe('deleteTag', () => {
    it('should delete an existing tag', () => {
      const tag = createTag(db, { name: 'to-delete', category: 'temp' })

      const result = deleteTag(db, tag.id as number)
      expect(result.changes).toBe(1)

      const remaining = db.prepare('SELECT * FROM tags').all()
      expect(remaining).toHaveLength(0)
    })

    it('should return changes=0 when tag does not exist', () => {
      const result = deleteTag(db, 9999)
      expect(result.changes).toBe(0)
    })

    it('should cascade delete related pattern_tags entries', () => {
      // Create a pattern first
      db.exec(`
        INSERT INTO patterns (name, type, source, file_path)
        VALUES ('test-pattern', 'skill', 'internal', '/test/path');
      `)
      const pattern = db.prepare('SELECT id FROM patterns WHERE name = ?').get('test-pattern') as {
        id: number
      }

      // Create a tag
      const tag = createTag(db, { name: 'linked-tag', category: 'test' })

      // Link pattern and tag
      db.prepare('INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (?, ?)').run(
        pattern.id,
        tag.id
      )

      // Verify link exists
      const linksBefore = db.prepare('SELECT * FROM pattern_tags').all()
      expect(linksBefore).toHaveLength(1)

      // Delete tag -- should cascade
      deleteTag(db, tag.id as number)

      const linksAfter = db.prepare('SELECT * FROM pattern_tags').all()
      expect(linksAfter).toHaveLength(0)
    })
  })

  // --- getTagsByCategory ---

  describe('getTagsByCategory', () => {
    beforeEach(() => {
      db.exec(`
        INSERT INTO tags (name, category) VALUES ('react', 'framework');
        INSERT INTO tags (name, category) VALUES ('vue', 'framework');
        INSERT INTO tags (name, category) VALUES ('python', 'language');
        INSERT INTO tags (name, category) VALUES ('angular', 'framework');
      `)
    })

    it('should return tags filtered by category, ordered by name', () => {
      const result = getTagsByCategory(db, 'framework')
      expect(result).toHaveLength(3)
      expect(result.map((t: { name: string }) => t.name)).toEqual([
        'angular',
        'react',
        'vue'
      ])
    })

    it('should return empty array for non-existent category', () => {
      const result = getTagsByCategory(db, 'nonexistent')
      expect(result).toEqual([])
    })

    it('should return only tags matching exact category', () => {
      const result = getTagsByCategory(db, 'language')
      expect(result).toHaveLength(1)
      expect((result[0] as { name: string }).name).toBe('python')
    })
  })
})
