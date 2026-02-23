// @TASK P1-R1-T1 - Patterns IPC Handler Tests
// @SPEC docs/planning/02-trd.md#patterns-api

import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getPatterns,
  getPatternById,
  createPattern,
  updatePattern,
  deletePattern,
  searchPatterns,
  getRelatedPatterns
} from './pattern.ipc'

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
`

let db: Database.Database

function seedTags(): void {
  db.exec(`
    INSERT INTO tags (name, category) VALUES ('typescript', 'language');
    INSERT INTO tags (name, category) VALUES ('react', 'framework');
    INSERT INTO tags (name, category) VALUES ('python', 'language');
    INSERT INTO tags (name, category) VALUES ('orchestration', 'type');
  `)
}

function seedPatterns(): void {
  db.exec(`
    INSERT INTO patterns (name, type, description, source, file_path)
    VALUES ('Auth Skill', 'skill', 'Authentication skill pattern', 'internal', '/skills/auth.md');

    INSERT INTO patterns (name, type, description, source, source_url, file_path)
    VALUES ('Code Review Agent', 'agent', 'Automated code review agent', 'external', 'https://example.com/cr', '/agents/code-review.md');

    INSERT INTO patterns (name, type, description, source, file_path)
    VALUES ('Deploy Pipeline', 'orchestration', 'CI/CD deployment orchestration', 'internal', '/orchestrations/deploy.md');

    INSERT INTO patterns (name, type, description, source, file_path)
    VALUES ('Testing Skill', 'skill', 'Unit testing skill pattern', 'internal', '/skills/testing.md');
  `)
}

function seedPatternTags(): void {
  db.exec(`
    INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (1, 1);
    INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (1, 2);
    INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (2, 1);
    INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (3, 4);
    INSERT INTO pattern_tags (pattern_id, tag_id) VALUES (4, 1);
  `)
}

function seedAll(): void {
  seedTags()
  seedPatterns()
  seedPatternTags()
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
})

afterEach(() => {
  db.close()
})

// ---------------------------------------------------------------------------
// getPatterns (pattern:get-all)
// ---------------------------------------------------------------------------

describe('getPatterns', () => {
  it('returns empty array when no patterns exist', () => {
    const result = getPatterns(db)
    expect(result).toEqual([])
  })

  it('returns all patterns with tags joined', () => {
    seedAll()
    const result = getPatterns(db)

    expect(result).toHaveLength(4)
    // Patterns should be ordered by updated_at DESC (most recent first)
    // Since all were inserted at roughly the same time, order may vary.
    // But we can check all names are present.
    const names = result.map((r) => r.name)
    expect(names).toContain('Auth Skill')
    expect(names).toContain('Code Review Agent')
    expect(names).toContain('Deploy Pipeline')
    expect(names).toContain('Testing Skill')
  })

  it('includes tag_names as comma-separated string', () => {
    seedAll()
    const result = getPatterns(db)
    const authSkill = result.find((r) => r.name === 'Auth Skill')

    expect(authSkill).toBeDefined()
    // Auth Skill has tags: typescript, react
    const tagNames = (authSkill!.tag_names as string).split(',')
    expect(tagNames).toContain('typescript')
    expect(tagNames).toContain('react')
  })

  it('returns null tag_names for patterns without tags', () => {
    seedPatterns() // no tags seeded
    const result = getPatterns(db)
    const authSkill = result.find((r) => r.name === 'Auth Skill')

    expect(authSkill).toBeDefined()
    expect(authSkill!.tag_names).toBeNull()
  })

  it('filters by type', () => {
    seedAll()
    const result = getPatterns(db, { type: 'skill' })

    expect(result).toHaveLength(2)
    result.forEach((r) => expect(r.type).toBe('skill'))
  })

  it('filters by search term in name', () => {
    seedAll()
    const result = getPatterns(db, { search: 'Auth' })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Auth Skill')
  })

  it('filters by search term in description', () => {
    seedAll()
    const result = getPatterns(db, { search: 'deployment' })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Deploy Pipeline')
  })

  it('combines type and search filters', () => {
    seedAll()
    const result = getPatterns(db, { type: 'skill', search: 'testing' })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Testing Skill')
  })

  it('returns empty array when filters match nothing', () => {
    seedAll()
    const result = getPatterns(db, { type: 'skill', search: 'nonexistent' })

    expect(result).toEqual([])
  })

  it('orders by updated_at DESC', () => {
    seedAll()
    // Update one pattern to make it most recent
    db.prepare("UPDATE patterns SET name = 'Auth Skill Updated', updated_at = datetime('now', '+1 hour') WHERE id = 1").run()

    const result = getPatterns(db)
    expect(result[0].name).toBe('Auth Skill Updated')
  })
})

// ---------------------------------------------------------------------------
// getPatternById (pattern:get-by-id)
// ---------------------------------------------------------------------------

describe('getPatternById', () => {
  it('returns a pattern by id with tags', () => {
    seedAll()
    const result = getPatternById(db, 1)

    expect(result).toBeDefined()
    expect(result!.name).toBe('Auth Skill')
    expect(result!.type).toBe('skill')
    expect(result!.source).toBe('internal')
    expect(result!.file_path).toBe('/skills/auth.md')
    // Should have tags
    const tagNames = (result!.tag_names as string).split(',')
    expect(tagNames).toContain('typescript')
    expect(tagNames).toContain('react')
  })

  it('returns undefined for non-existent id', () => {
    seedAll()
    const result = getPatternById(db, 999)
    expect(result).toBeUndefined()
  })

  it('returns pattern without tags correctly', () => {
    seedPatterns() // no tags
    const result = getPatternById(db, 1)

    expect(result).toBeDefined()
    expect(result!.name).toBe('Auth Skill')
    expect(result!.tag_names).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createPattern (pattern:create)
// ---------------------------------------------------------------------------

describe('createPattern', () => {
  it('creates a new pattern and returns it', () => {
    const input = {
      name: 'New Skill',
      type: 'skill' as const,
      description: 'A brand new skill',
      source: 'internal' as const,
      file_path: '/skills/new.md'
    }
    const result = createPattern(db, input)

    expect(result.id).toBe(1)
    expect(result.name).toBe('New Skill')
    expect(result.type).toBe('skill')
    expect(result.description).toBe('A brand new skill')
    expect(result.source).toBe('internal')
    expect(result.file_path).toBe('/skills/new.md')
    expect(result.created_at).toBeDefined()
    expect(result.updated_at).toBeDefined()
  })

  it('creates a pattern with all optional fields', () => {
    const input = {
      name: 'External Agent',
      type: 'agent' as const,
      description: 'An external agent pattern',
      source: 'external' as const,
      source_url: 'https://example.com/agent',
      structure_preview: '## Structure\n- Step 1\n- Step 2',
      file_path: '/agents/external.md'
    }
    const result = createPattern(db, input)

    expect(result.source_url).toBe('https://example.com/agent')
    expect(result.structure_preview).toBe('## Structure\n- Step 1\n- Step 2')
  })

  it('creates a pattern with tags', () => {
    seedTags()
    const input = {
      name: 'Tagged Skill',
      type: 'skill' as const,
      description: 'A skill with tags',
      source: 'internal' as const,
      file_path: '/skills/tagged.md',
      tag_ids: [1, 2] // typescript, react
    }
    const result = createPattern(db, input)

    expect(result.id).toBe(1)
    // Verify tags were linked
    const patternWithTags = getPatternById(db, result.id)
    const tagNames = (patternWithTags!.tag_names as string).split(',')
    expect(tagNames).toContain('typescript')
    expect(tagNames).toContain('react')
  })

  it('throws on invalid type', () => {
    const input = {
      name: 'Bad Type',
      type: 'invalid' as never,
      description: 'bad',
      source: 'internal' as const,
      file_path: '/bad.md'
    }
    expect(() => createPattern(db, input)).toThrow()
  })

  it('throws on invalid source', () => {
    const input = {
      name: 'Bad Source',
      type: 'skill' as const,
      description: 'bad',
      source: 'invalid' as never,
      file_path: '/bad.md'
    }
    expect(() => createPattern(db, input)).toThrow()
  })

  it('throws when name is empty', () => {
    const input = {
      name: '',
      type: 'skill' as const,
      description: 'bad',
      source: 'internal' as const,
      file_path: '/bad.md'
    }
    expect(() => createPattern(db, input)).toThrow()
  })

  it('throws when file_path is empty', () => {
    const input = {
      name: 'No Path',
      type: 'skill' as const,
      description: 'bad',
      source: 'internal' as const,
      file_path: ''
    }
    expect(() => createPattern(db, input)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// updatePattern (pattern:update)
// ---------------------------------------------------------------------------

describe('updatePattern', () => {
  it('updates a pattern name', () => {
    seedAll()
    const result = updatePattern(db, 1, { name: 'Updated Auth Skill' })

    expect(result).toBeDefined()
    expect(result!.name).toBe('Updated Auth Skill')
  })

  it('updates multiple fields at once', () => {
    seedAll()
    const result = updatePattern(db, 1, {
      name: 'Updated Auth',
      description: 'Updated description',
      source_url: 'https://updated.com'
    })

    expect(result!.name).toBe('Updated Auth')
    expect(result!.description).toBe('Updated description')
    expect(result!.source_url).toBe('https://updated.com')
  })

  it('updates updated_at timestamp', () => {
    seedAll()
    const before = getPatternById(db, 1)
    // Small delay to ensure different timestamp
    db.prepare("UPDATE patterns SET updated_at = datetime('now', '-1 hour') WHERE id = 1").run()
    const beforeUpdated = getPatternById(db, 1)!.updated_at

    const result = updatePattern(db, 1, { name: 'Updated' })

    expect(result!.updated_at).not.toBe(beforeUpdated)
  })

  it('updates tags when tag_ids provided', () => {
    seedAll()
    // Pattern 1 originally has tags [1, 2] (typescript, react)
    // Change to [3] (python)
    const result = updatePattern(db, 1, { tag_ids: [3] })

    expect(result).toBeDefined()
    const updated = getPatternById(db, 1)
    expect(updated!.tag_names).toBe('python')
  })

  it('removes all tags when empty tag_ids provided', () => {
    seedAll()
    updatePattern(db, 1, { tag_ids: [] })

    const updated = getPatternById(db, 1)
    expect(updated!.tag_names).toBeNull()
  })

  it('returns undefined for non-existent id', () => {
    seedAll()
    const result = updatePattern(db, 999, { name: 'Ghost' })
    expect(result).toBeUndefined()
  })

  it('throws on invalid type update', () => {
    seedAll()
    expect(() => updatePattern(db, 1, { type: 'invalid' as never })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// deletePattern (pattern:delete)
// ---------------------------------------------------------------------------

describe('deletePattern', () => {
  it('deletes a pattern and returns true', () => {
    seedAll()
    const result = deletePattern(db, 1)

    expect(result).toBe(true)
    expect(getPatternById(db, 1)).toBeUndefined()
  })

  it('returns false for non-existent id', () => {
    seedAll()
    const result = deletePattern(db, 999)
    expect(result).toBe(false)
  })

  it('cascades delete to pattern_tags', () => {
    seedAll()
    deletePattern(db, 1)

    const remainingTags = db.prepare('SELECT * FROM pattern_tags WHERE pattern_id = 1').all()
    expect(remainingTags).toHaveLength(0)
  })

  it('does not delete tags themselves', () => {
    seedAll()
    deletePattern(db, 1)

    const tags = db.prepare('SELECT * FROM tags').all()
    expect(tags).toHaveLength(4) // All tags still exist
  })
})

// ---------------------------------------------------------------------------
// searchPatterns (pattern:search)
// ---------------------------------------------------------------------------

describe('searchPatterns', () => {
  it('searches by name', () => {
    seedAll()
    const result = searchPatterns(db, 'Auth')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Auth Skill')
  })

  it('searches by description', () => {
    seedAll()
    const result = searchPatterns(db, 'automated')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Code Review Agent')
  })

  it('is case-insensitive', () => {
    seedAll()
    const result = searchPatterns(db, 'auth')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Auth Skill')
  })

  it('returns empty array for no matches', () => {
    seedAll()
    const result = searchPatterns(db, 'zzzznonexistent')

    expect(result).toEqual([])
  })

  it('returns multiple matches', () => {
    seedAll()
    const result = searchPatterns(db, 'skill')

    // "Auth Skill" (name), "Testing Skill" (name),
    // "Authentication skill pattern" (desc), "Unit testing skill pattern" (desc)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('includes tag_names in search results', () => {
    seedAll()
    const result = searchPatterns(db, 'Auth')

    expect(result[0].tag_names).toBeDefined()
    const tagNames = (result[0].tag_names as string).split(',')
    expect(tagNames).toContain('typescript')
  })
})

// ---------------------------------------------------------------------------
// getRelatedPatterns (pattern:get-related)
// ---------------------------------------------------------------------------

describe('getRelatedPatterns', () => {
  it('returns patterns of the same type excluding self', () => {
    seedAll()
    const result = getRelatedPatterns(db, 1) // Auth Skill (type: skill)

    // Should return Testing Skill (also type: skill), but NOT Auth Skill itself
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Testing Skill')
  })

  it('returns empty array when no related patterns exist', () => {
    seedAll()
    const result = getRelatedPatterns(db, 3) // Deploy Pipeline (type: orchestration)

    // Only one orchestration pattern
    expect(result).toEqual([])
  })

  it('returns empty array for non-existent id', () => {
    seedAll()
    const result = getRelatedPatterns(db, 999)

    expect(result).toEqual([])
  })

  it('includes tag_names in results', () => {
    seedAll()
    const result = getRelatedPatterns(db, 1) // skill type

    // Testing Skill has tag: typescript
    expect(result[0].tag_names).toBe('typescript')
  })

  it('limits results', () => {
    // Add more skill patterns
    seedAll()
    for (let i = 0; i < 10; i++) {
      db.prepare(
        "INSERT INTO patterns (name, type, description, source, file_path) VALUES (?, 'skill', 'Extra pattern', 'internal', ?)"
      ).run(`Extra Skill ${i}`, `/skills/extra-${i}.md`)
    }

    const result = getRelatedPatterns(db, 1, 5)

    expect(result).toHaveLength(5)
    // Should not include Auth Skill (id=1)
    result.forEach((r) => expect(r.id).not.toBe(1))
  })
})
