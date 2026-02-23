// @TASK P1-R8-T1 - File Export IPC Handlers
// @SPEC docs/planning - file export, directory browse, .claude/ detect, path validate
// @TEST electron/ipc/file.ipc.test.ts

import { writeFileSync, existsSync, mkdirSync, accessSync, constants } from 'fs'
import { join, dirname } from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportResult {
  success: boolean
  error?: string
}

export interface ValidatePathResult {
  valid: boolean
  reason?: string
}

export interface BrowseDirectoryResult {
  canceled: boolean
  filePaths: string[]
}

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * file:export - Write content to a file at the specified path.
 * Creates parent directories recursively if they don't exist.
 * Returns success/error result (never throws).
 */
export function exportFile(filePath: string, content: string): ExportResult {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * file:detect-claude-dir - Detect .claude/ directory starting from a given path.
 * Checks if ~/.claude (or startPath/.claude) exists.
 * Returns the full path to .claude/ or null if not found.
 */
export function detectClaudeDir(startPath?: string): string | null {
  // When called without startPath in IPC context, we use app.getPath('home').
  // In pure function form, startPath must be provided for testability.
  if (!startPath) return null

  const claudeDir = join(startPath, '.claude')
  if (existsSync(claudeDir)) return claudeDir
  return null
}

/**
 * file:validate-path - Validate that a target file path is writable.
 * Checks that the parent directory exists and is writable.
 */
export function validatePath(targetPath: string): ValidatePathResult {
  try {
    const parentDir = dirname(targetPath)
    if (!existsSync(parentDir)) {
      return { valid: false, reason: 'Parent directory does not exist' }
    }
    accessSync(parentDir, constants.W_OK)
    return { valid: true }
  } catch {
    return { valid: false, reason: 'Path is not writable' }
  }
}

/**
 * Get the appropriate export subdirectory name for a given file type.
 * Used to organize exports under .claude/skills/, .claude/agents/, etc.
 */
export function getExportSubdir(fileType: string): string {
  switch (fileType) {
    case 'skill_md':
      return 'skills'
    case 'agent_md':
      return 'agents'
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all file-related IPC handlers.
 * Called during app initialization in main.ts.
 *
 * Channels:
 *   file:export          - Export content to a file path
 *   file:browse-directory - Open native directory picker dialog
 *   file:detect-claude-dir - Detect ~/.claude directory
 *   file:validate-path   - Validate a target path is writable
 */
export function registerFileHandlers(): void {
  // Deferred imports to avoid issues in test environments
  // where the 'electron' module is not available.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ipcMain, dialog, app, BrowserWindow } = require('electron')

  ipcMain.handle(
    'file:export',
    (_event: unknown, filePath: string, content: string) => {
      return exportFile(filePath, content)
    }
  )

  ipcMain.handle('file:browse-directory', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Export Directory'
    })
    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    } as BrowseDirectoryResult
  })

  ipcMain.handle('file:detect-claude-dir', () => {
    const home = app.getPath('home')
    return detectClaudeDir(home)
  })

  ipcMain.handle('file:validate-path', (_event: unknown, targetPath: string) => {
    return validatePath(targetPath)
  })
}
