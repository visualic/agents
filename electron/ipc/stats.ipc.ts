// @TASK P1-R6-T1 - Stats IPC Handlers
// @SPEC docs/planning/02-trd.md#stats-api
// @TEST electron/ipc/stats.ipc.test.ts

import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import { getDatabase } from '../db/index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecentWork {
  id: number
  name: string
  type: 'skill' | 'agent' | 'orchestration'
  status: 'draft' | 'completed' | 'exported'
  created_at: string
}

export interface StatsSummary {
  total_patterns: number
  total_works: number
  recent_works: RecentWork[]
}

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * stats:get-summary - Returns dashboard summary statistics.
 *
 * - total_patterns: COUNT(*) from patterns
 * - total_works: COUNT(*) from works
 * - recent_works: 5 most recent works ordered by created_at DESC
 */
export function getStatsSummary(db: Database.Database): StatsSummary {
  const patternCount = db
    .prepare('SELECT COUNT(*) as count FROM patterns')
    .get() as { count: number }

  const workCount = db
    .prepare('SELECT COUNT(*) as count FROM works')
    .get() as { count: number }

  const recentWorks = db
    .prepare(
      'SELECT id, name, type, status, created_at FROM works ORDER BY created_at DESC LIMIT 5'
    )
    .all() as RecentWork[]

  return {
    total_patterns: patternCount.count,
    total_works: workCount.count,
    recent_works: recentWorks
  }
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all stats-related IPC handlers.
 * Called during app initialization in main.ts.
 */
export function registerStatsHandlers(): void {
  ipcMain.handle('stats:get-summary', () => {
    return getStatsSummary(getDatabase())
  })
}
