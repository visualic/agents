// @TASK P1-R5-T1 - Guide Sessions IPC Handler Tests
// @SPEC docs/planning/02-trd.md#guide-sessions-api

import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getGuideSessionByWorkId,
  createGuideSession,
  updateGuideStep,
  addMessage,
  getConversation
} from './guide.ipc'

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

/** Insert a work row so FK constraints are satisfied. Returns the work id. */
function seedWork(db: Database.Database, name = 'Test Work'): number {
  const info = db
    .prepare("INSERT INTO works (name, type) VALUES (?, 'skill')")
    .run(name)
  return info.lastInsertRowid as number
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => {
  db.close()
})

// ---------------------------------------------------------------------------
// createGuideSession (guide:create)
// ---------------------------------------------------------------------------

describe('createGuideSession', () => {
  it('creates a session with initial step1 and empty conversation_log', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    expect(session).toMatchObject({
      id: expect.any(Number),
      work_id: workId,
      current_step: 'step1',
      conversation_log: '[]'
    })
    expect(session.created_at).toBeDefined()
    expect(session.updated_at).toBeDefined()
  })

  it('returns incrementing ids for multiple sessions', () => {
    const workId = seedWork(db)
    const s1 = createGuideSession(db, workId)
    const s2 = createGuideSession(db, workId)

    expect(s2.id).toBeGreaterThan(s1.id)
  })

  it('throws for non-existent work_id (FK constraint)', () => {
    expect(() => createGuideSession(db, 999)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// getGuideSessionByWorkId (guide:get-by-work-id)
// ---------------------------------------------------------------------------

describe('getGuideSessionByWorkId', () => {
  it('returns the session for a given work_id', () => {
    const workId = seedWork(db)
    const created = createGuideSession(db, workId)

    const result = getGuideSessionByWorkId(db, workId)

    expect(result).toBeDefined()
    expect(result!.id).toBe(created.id)
    expect(result!.work_id).toBe(workId)
    expect(result!.current_step).toBe('step1')
  })

  it('returns the most recent session when multiple exist for a work', () => {
    const workId = seedWork(db)
    createGuideSession(db, workId)
    const latest = createGuideSession(db, workId)

    const result = getGuideSessionByWorkId(db, workId)

    expect(result).toBeDefined()
    expect(result!.id).toBe(latest.id)
  })

  it('returns null when no session exists for the work_id', () => {
    const workId = seedWork(db)
    const result = getGuideSessionByWorkId(db, workId)

    expect(result).toBeNull()
  })

  it('returns null for non-existent work_id', () => {
    const result = getGuideSessionByWorkId(db, 999)

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateGuideStep (guide:update-step)
// ---------------------------------------------------------------------------

describe('updateGuideStep', () => {
  it('updates current_step to a valid step', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    const updated = updateGuideStep(db, session.id, 'step3')

    expect(updated).toBeDefined()
    expect(updated!.current_step).toBe('step3')
  })

  it('updates updated_at timestamp', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    // Force an older timestamp so we can detect the change
    db.prepare(
      "UPDATE guide_sessions SET updated_at = datetime('now', '-1 hour') WHERE id = ?"
    ).run(session.id)
    const before = db
      .prepare('SELECT updated_at FROM guide_sessions WHERE id = ?')
      .get(session.id) as { updated_at: string }

    const updated = updateGuideStep(db, session.id, 'step2')

    expect(updated!.updated_at).not.toBe(before.updated_at)
  })

  it('accepts all valid step values', () => {
    const workId = seedWork(db)

    for (const step of ['step1', 'step2', 'step3', 'step4', 'step5'] as const) {
      const session = createGuideSession(db, workId)
      const updated = updateGuideStep(db, session.id, step)
      expect(updated!.current_step).toBe(step)
    }
  })

  it('throws for invalid step value', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    expect(() => updateGuideStep(db, session.id, 'step99' as never)).toThrow()
  })

  it('returns null for non-existent session id', () => {
    const result = updateGuideStep(db, 999, 'step2')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// addMessage (guide:add-message)
// ---------------------------------------------------------------------------

describe('addMessage', () => {
  it('appends a user message to empty conversation_log', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    const updated = addMessage(db, session.id, {
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })

    expect(updated).toBeDefined()
    const log = JSON.parse(updated!.conversation_log)
    expect(log).toHaveLength(1)
    expect(log[0]).toEqual({
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })
  })

  it('appends an assistant message to existing log', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    addMessage(db, session.id, {
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })

    const updated = addMessage(db, session.id, {
      role: 'assistant',
      content: 'Hi there!',
      timestamp: '2026-02-24T10:00:01Z'
    })

    const log = JSON.parse(updated!.conversation_log)
    expect(log).toHaveLength(2)
    expect(log[0].role).toBe('user')
    expect(log[1].role).toBe('assistant')
    expect(log[1].content).toBe('Hi there!')
  })

  it('preserves existing messages when appending', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    // Add 3 messages sequentially
    addMessage(db, session.id, {
      role: 'user',
      content: 'First',
      timestamp: '2026-02-24T10:00:00Z'
    })
    addMessage(db, session.id, {
      role: 'assistant',
      content: 'Second',
      timestamp: '2026-02-24T10:00:01Z'
    })
    const updated = addMessage(db, session.id, {
      role: 'user',
      content: 'Third',
      timestamp: '2026-02-24T10:00:02Z'
    })

    const log = JSON.parse(updated!.conversation_log)
    expect(log).toHaveLength(3)
    expect(log[0].content).toBe('First')
    expect(log[1].content).toBe('Second')
    expect(log[2].content).toBe('Third')
  })

  it('updates updated_at when adding a message', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    db.prepare(
      "UPDATE guide_sessions SET updated_at = datetime('now', '-1 hour') WHERE id = ?"
    ).run(session.id)
    const before = db
      .prepare('SELECT updated_at FROM guide_sessions WHERE id = ?')
      .get(session.id) as { updated_at: string }

    const updated = addMessage(db, session.id, {
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })

    expect(updated!.updated_at).not.toBe(before.updated_at)
  })

  it('returns null for non-existent session id', () => {
    const result = addMessage(db, 999, {
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getConversation (guide:get-conversation)
// ---------------------------------------------------------------------------

describe('getConversation', () => {
  it('returns empty array for new session', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    const log = getConversation(db, session.id)

    expect(log).toEqual([])
  })

  it('returns parsed messages array', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    addMessage(db, session.id, {
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })
    addMessage(db, session.id, {
      role: 'assistant',
      content: 'Hi!',
      timestamp: '2026-02-24T10:00:01Z'
    })

    const log = getConversation(db, session.id)

    expect(log).toHaveLength(2)
    expect(log[0]).toEqual({
      role: 'user',
      content: 'Hello',
      timestamp: '2026-02-24T10:00:00Z'
    })
    expect(log[1]).toEqual({
      role: 'assistant',
      content: 'Hi!',
      timestamp: '2026-02-24T10:00:01Z'
    })
  })

  it('returns null for non-existent session id', () => {
    const result = getConversation(db, 999)

    expect(result).toBeNull()
  })

  it('handles messages with special characters in content', () => {
    const workId = seedWork(db)
    const session = createGuideSession(db, workId)

    const specialContent = 'Code: `const x = "hello";\nif (x) { return; }`'
    addMessage(db, session.id, {
      role: 'user',
      content: specialContent,
      timestamp: '2026-02-24T10:00:00Z'
    })

    const log = getConversation(db, session.id)

    expect(log).toHaveLength(1)
    expect(log[0].content).toBe(specialContent)
  })
})
