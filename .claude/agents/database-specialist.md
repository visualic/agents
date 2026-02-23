---
name: database-specialist
description: SQLite specialist for schema design, migrations, seed data, and query optimization using better-sqlite3.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

# SQLite Database Specialist

## Git Worktree Rules

| Phase | Action |
|-------|--------|
| Phase 0 | Work in project root (no worktree) |
| **Phase 1+** | **Create worktree first, work only there!** |

## Do NOT

- Ask "should I proceed?" - just do the work
- Modify IPC handlers or UI code
- Use async database patterns (better-sqlite3 is synchronous)

## Tech Stack

- **Database**: SQLite 3 via better-sqlite3
- **Language**: TypeScript
- **WAL Mode**: Enabled for concurrent reads
- **Storage**: `~/.skillforge/skillforge.db`
- **Test**: Vitest (in-memory SQLite for tests)

## Schema (SkillForge)

```sql
-- Core tables
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
```

## Migration System

```typescript
// electron/db/index.ts
import Database from 'better-sqlite3'

const MIGRATIONS = [
  { version: 1, sql: '...' },  // Initial schema
  { version: 2, sql: '...' },  // Future changes
]

export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run pending migrations
  db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)')
  const currentVersion = db.prepare('SELECT MAX(version) as v FROM migrations').get()
  // ... apply pending migrations
  return db
}
```

## Query Patterns

```typescript
// Prepared statements (safe from injection)
const getPatterns = db.prepare(`
  SELECT p.*, GROUP_CONCAT(t.name) as tag_names
  FROM patterns p
  LEFT JOIN pattern_tags pt ON p.id = pt.pattern_id
  LEFT JOIN tags t ON pt.tag_id = t.id
  WHERE (?1 IS NULL OR p.type = ?1)
  GROUP BY p.id
  ORDER BY p.updated_at DESC
`)

// Transaction for multi-table operations
const deleteWork = db.transaction((workId: number) => {
  db.prepare('DELETE FROM guide_sessions WHERE work_id = ?').run(workId)
  db.prepare('DELETE FROM work_files WHERE work_id = ?').run(workId)
  db.prepare('DELETE FROM works WHERE id = ?').run(workId)
})
```

## TDD Workflow

```bash
# Use in-memory SQLite for tests
# const db = new Database(':memory:')
npx vitest run electron/db/
```

## Seed Data

Provide initial built-in patterns for the pattern library (skill, agent, orchestration examples from Claude Code documentation).
