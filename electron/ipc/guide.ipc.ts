// @TASK P1-R5-T1 - Guide Sessions IPC Handlers
// @SPEC docs/planning/02-trd.md#guide-sessions-api
// @TEST electron/ipc/guide.ipc.test.ts

import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import { getDatabase } from '../db/index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuideSession {
  id: number
  work_id: number
  current_step: 'step1' | 'step2' | 'step3' | 'step4' | 'step5'
  conversation_log: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type ValidStep = 'step1' | 'step2' | 'step3' | 'step4' | 'step5'

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * guide:get-by-work-id - Get the most recent guide session for a work.
 * Returns the latest session (by id DESC) or null if none exists.
 */
export function getGuideSessionByWorkId(
  db: Database.Database,
  workId: number
): GuideSession | null {
  const row = db
    .prepare('SELECT * FROM guide_sessions WHERE work_id = ? ORDER BY id DESC LIMIT 1')
    .get(workId) as GuideSession | undefined
  return row ?? null
}

/**
 * guide:create - Create a new guide session for a work.
 * Initializes with current_step='step1' and empty conversation_log.
 */
export function createGuideSession(
  db: Database.Database,
  workId: number
): GuideSession {
  const info = db
    .prepare(
      "INSERT INTO guide_sessions (work_id, current_step, conversation_log) VALUES (?, 'step1', '[]')"
    )
    .run(workId)

  return db
    .prepare('SELECT * FROM guide_sessions WHERE id = ?')
    .get(info.lastInsertRowid as number) as GuideSession
}

/**
 * guide:update-step - Update the current step of a guide session.
 * Also updates the updated_at timestamp.
 * Returns the updated session or null if not found.
 */
export function updateGuideStep(
  db: Database.Database,
  sessionId: number,
  step: ValidStep
): GuideSession | null {
  const info = db
    .prepare(
      "UPDATE guide_sessions SET current_step = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .run(step, sessionId)

  if (info.changes === 0) return null

  return db
    .prepare('SELECT * FROM guide_sessions WHERE id = ?')
    .get(sessionId) as GuideSession
}

/**
 * guide:add-message - Append a message to the session's conversation_log.
 * Reads the existing JSON array, pushes the new message, and writes back.
 * Also updates updated_at.
 * Returns the updated session or null if not found.
 */
export function addMessage(
  db: Database.Database,
  sessionId: number,
  message: ConversationMessage
): GuideSession | null {
  // Read existing conversation_log
  const session = db
    .prepare('SELECT * FROM guide_sessions WHERE id = ?')
    .get(sessionId) as GuideSession | undefined

  if (!session) return null

  const log: ConversationMessage[] = JSON.parse(session.conversation_log)
  log.push(message)

  db.prepare(
    "UPDATE guide_sessions SET conversation_log = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(log), sessionId)

  return db
    .prepare('SELECT * FROM guide_sessions WHERE id = ?')
    .get(sessionId) as GuideSession
}

/**
 * guide:get-conversation - Get the parsed conversation_log for a session.
 * Returns the array of messages or null if session not found.
 */
export function getConversation(
  db: Database.Database,
  sessionId: number
): ConversationMessage[] | null {
  const session = db
    .prepare('SELECT conversation_log FROM guide_sessions WHERE id = ?')
    .get(sessionId) as { conversation_log: string } | undefined

  if (!session) return null

  return JSON.parse(session.conversation_log) as ConversationMessage[]
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all guide-session-related IPC handlers.
 * Called during app initialization in main.ts.
 */
export function registerGuideHandlers(): void {
  const db = getDatabase()

  ipcMain.handle('guide:get-by-work-id', (_event, workId: number) => {
    return getGuideSessionByWorkId(db, workId)
  })

  ipcMain.handle('guide:create', (_event, workId: number) => {
    return createGuideSession(db, workId)
  })

  ipcMain.handle('guide:update-step', (_event, sessionId: number, step: ValidStep) => {
    return updateGuideStep(db, sessionId, step)
  })

  ipcMain.handle(
    'guide:add-message',
    (_event, sessionId: number, message: ConversationMessage) => {
      return addMessage(db, sessionId, message)
    }
  )

  ipcMain.handle('guide:get-conversation', (_event, sessionId: number) => {
    return getConversation(db, sessionId)
  })
}
