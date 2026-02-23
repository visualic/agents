// @TASK P1-R6-T1 - Stats IPC Handler Tests
// @SPEC docs/planning/02-trd.md#stats-api

import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getStatsSummary } from './stats.ipc'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
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
`

let db: Database.Database

function createTestDb(): Database.Database {
  const testDb = new Database(':memory:')
  testDb.pragma('journal_mode = WAL')
  testDb.pragma('foreign_keys = ON')
  testDb.exec(SCHEMA_SQL)
  return testDb
}

function insertPattern(name: string, type: string = 'skill'): void {
  db.prepare(
    `INSERT INTO patterns (name, type, source, file_path) VALUES (?, ?, 'internal', ?)`
  ).run(name, type, `/patterns/${name.toLowerCase().replace(/\s+/g, '-')}.md`)
}

function insertWork(
  name: string,
  type: string = 'skill',
  status: string = 'draft',
  createdAt?: string
): void {
  if (createdAt) {
    db.prepare(
      `INSERT INTO works (name, type, status, created_at) VALUES (?, ?, ?, ?)`
    ).run(name, type, status, createdAt)
  } else {
    db.prepare(
      `INSERT INTO works (name, type, status) VALUES (?, ?, ?)`
    ).run(name, type, status)
  }
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => {
  db.close()
})

// ---------------------------------------------------------------------------
// getStatsSummary (stats:get-summary)
// ---------------------------------------------------------------------------

describe('getStatsSummary', () => {
  it('returns zero counts and empty recent_works on empty database', () => {
    const result = getStatsSummary(db)

    expect(result).toEqual({
      total_patterns: 0,
      total_works: 0,
      recent_works: []
    })
  })

  it('returns correct counts after inserting patterns and works', () => {
    insertPattern('Auth Skill')
    insertPattern('Code Review Agent', 'agent')
    insertPattern('Deploy Pipeline', 'orchestration')
    insertWork('My Skill', 'skill')
    insertWork('My Agent', 'agent')

    const result = getStatsSummary(db)

    expect(result.total_patterns).toBe(3)
    expect(result.total_works).toBe(2)
    expect(result.recent_works).toHaveLength(2)
  })

  it('returns max 5 recent_works ordered by created_at DESC', () => {
    // Insert 7 works with explicit timestamps to ensure ordering
    insertWork('Work 1', 'skill', 'draft', '2025-01-01 00:00:00')
    insertWork('Work 2', 'skill', 'draft', '2025-01-02 00:00:00')
    insertWork('Work 3', 'agent', 'completed', '2025-01-03 00:00:00')
    insertWork('Work 4', 'skill', 'draft', '2025-01-04 00:00:00')
    insertWork('Work 5', 'orchestration', 'exported', '2025-01-05 00:00:00')
    insertWork('Work 6', 'agent', 'draft', '2025-01-06 00:00:00')
    insertWork('Work 7', 'skill', 'completed', '2025-01-07 00:00:00')

    const result = getStatsSummary(db)

    expect(result.total_works).toBe(7)
    expect(result.recent_works).toHaveLength(5)

    // Should be ordered by created_at DESC: Work 7, 6, 5, 4, 3
    expect(result.recent_works[0].name).toBe('Work 7')
    expect(result.recent_works[1].name).toBe('Work 6')
    expect(result.recent_works[2].name).toBe('Work 5')
    expect(result.recent_works[3].name).toBe('Work 4')
    expect(result.recent_works[4].name).toBe('Work 3')
  })

  it('recent_works includes correct fields (id, name, type, status, created_at)', () => {
    insertWork('Test Work', 'agent', 'completed')

    const result = getStatsSummary(db)

    expect(result.recent_works).toHaveLength(1)
    const work = result.recent_works[0]

    expect(work).toHaveProperty('id')
    expect(work).toHaveProperty('name')
    expect(work).toHaveProperty('type')
    expect(work).toHaveProperty('status')
    expect(work).toHaveProperty('created_at')

    expect(work.id).toBe(1)
    expect(work.name).toBe('Test Work')
    expect(work.type).toBe('agent')
    expect(work.status).toBe('completed')
    expect(typeof work.created_at).toBe('string')

    // Should NOT include fields beyond what the spec requires
    const keys = Object.keys(work)
    expect(keys).toEqual(['id', 'name', 'type', 'status', 'created_at'])
  })

  it('counts are accurate after deletions', () => {
    insertPattern('Pattern A')
    insertPattern('Pattern B')
    insertWork('Work A', 'skill')
    insertWork('Work B', 'agent')
    insertWork('Work C', 'orchestration')

    // Verify initial counts
    let result = getStatsSummary(db)
    expect(result.total_patterns).toBe(2)
    expect(result.total_works).toBe(3)

    // Delete one pattern and one work
    db.prepare('DELETE FROM patterns WHERE name = ?').run('Pattern A')
    db.prepare('DELETE FROM works WHERE name = ?').run('Work B')

    result = getStatsSummary(db)

    expect(result.total_patterns).toBe(1)
    expect(result.total_works).toBe(2)
    expect(result.recent_works).toHaveLength(2)

    // Verify the deleted work is not in recent_works
    const workNames = result.recent_works.map((w) => w.name)
    expect(workNames).not.toContain('Work B')
    expect(workNames).toContain('Work A')
    expect(workNames).toContain('Work C')
  })
})
