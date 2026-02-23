// @TASK P1-R7-T1 - Claude CLI Streaming Wrapper
// @SPEC docs/planning - Claude CLI IPC: send-message, check-availability, abort
// @TEST electron/ipc/claude.ipc.test.ts

import { spawn, execSync, ChildProcess } from 'child_process'
import { ipcMain, BrowserWindow } from 'electron'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let activeProcess: ChildProcess | null = null

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron IPC)
// ---------------------------------------------------------------------------

/**
 * claude:check-availability - Check if Claude CLI is installed on the system.
 * Uses `which claude` to verify availability.
 * Returns true if installed, false otherwise.
 */
export function checkClaudeAvailability(): boolean {
  try {
    execSync('which claude', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * claude:send-message - Send a message to Claude CLI and stream the response.
 *
 * Spawns `claude -p <message> --output-format stream-json` as a child process.
 * Streams stdout chunks to the renderer via `claude:stream-chunk` events.
 * Streams stderr chunks to the renderer via `claude:stream-error` events.
 *
 * @param mainWindow - The BrowserWindow to send streaming events to
 * @param message - The user message to send to Claude
 * @param systemPrompt - Optional system prompt for Claude
 * @returns Promise that resolves with the full response text on exit code 0
 */
export function sendMessage(
  mainWindow: BrowserWindow,
  message: string,
  systemPrompt?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', message]
    if (systemPrompt) {
      args.push('--system', systemPrompt)
    }
    args.push('--output-format', 'stream-json')

    activeProcess = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let fullResponse = ''

    activeProcess.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      fullResponse += text
      mainWindow.webContents.send('claude:stream-chunk', text)
    })

    activeProcess.stderr?.on('data', (chunk: Buffer) => {
      mainWindow.webContents.send('claude:stream-error', chunk.toString())
    })

    activeProcess.on('close', (code) => {
      activeProcess = null
      if (code === 0) {
        resolve(fullResponse)
      } else {
        reject(new Error(`Claude CLI exited with code ${code}`))
      }
    })

    activeProcess.on('error', (err) => {
      activeProcess = null
      reject(err)
    })
  })
}

/**
 * claude:abort - Abort the currently active Claude CLI process.
 * Sends SIGTERM to gracefully terminate the process.
 * No-op if no active process.
 */
export function abortClaude(): void {
  if (activeProcess) {
    activeProcess.kill('SIGTERM')
    activeProcess = null
  }
}

/**
 * Test helper - expose active process for assertions.
 * Not used in production code.
 */
export function _getActiveProcess(): ChildProcess | null {
  return activeProcess
}

// ---------------------------------------------------------------------------
// IPC Registration (Electron runtime only)
// ---------------------------------------------------------------------------

/**
 * Register all Claude CLI-related IPC handlers.
 * Called during app initialization in main.ts.
 *
 * Channels:
 * - claude:check-availability -> boolean
 * - claude:send-message -> streams chunks, resolves with full response
 * - claude:abort -> void
 */
export function registerClaudeHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('claude:check-availability', () => {
    return checkClaudeAvailability()
  })

  ipcMain.handle(
    'claude:send-message',
    async (_event, message: string, systemPrompt?: string) => {
      return sendMessage(mainWindow, message, systemPrompt)
    }
  )

  ipcMain.handle('claude:abort', () => {
    abortClaude()
  })
}
