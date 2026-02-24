import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync } from 'fs'

const MIGRATIONS = [
  {
    version: 1,
    sql: `
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
    `
  },
  {
    version: 2,
    sql: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        artifact_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL CHECK(artifact_type IN ('skill','agent','orchestration','tooling','reference')),
        title TEXT NOT NULL,
        summary TEXT,
        source_url TEXT,
        source_owner TEXT,
        source_repo TEXT,
        license TEXT DEFAULT 'UNKNOWN',
        score_total INTEGER DEFAULT 0,
        quality_scores TEXT,
        risk_flags TEXT,
        tags TEXT,
        evidence_snippets TEXT,
        readme_content TEXT,
        meta TEXT,
        status TEXT NOT NULL DEFAULT 'curated' CHECK(status IN ('curated','review','verified','promoted','rejected')),
        curation_notes TEXT,
        promoted_pattern_id INTEGER REFERENCES patterns(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX idx_artifacts_run_artifact ON artifacts(run_id, artifact_id);
      CREATE INDEX idx_artifacts_status ON artifacts(status);
      CREATE INDEX idx_artifacts_type ON artifacts(artifact_type);
      CREATE INDEX idx_artifacts_score ON artifacts(score_total);
    `
  }
]

let db: Database.Database | null = null

export function initDatabase(dbPath?: string): Database.Database {
  const path = dbPath || getDefaultDbPath()
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)')
  const current = db.prepare('SELECT MAX(version) as v FROM migrations').get() as
    | { v: number | null }
    | undefined
  const currentVersion = current?.v ?? 0

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec(migration.sql)
      db.prepare('INSERT INTO migrations (version) VALUES (?)').run(migration.version)
    }
  }

  return db
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

function getDefaultDbPath(): string {
  const dir = join(app.getPath('home'), '.skillforge')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'skillforge.db')
}
