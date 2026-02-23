// @TASK P1-R7-T1 - Claude CLI Streaming Wrapper Tests
// @SPEC docs/planning - Claude CLI IPC: send-message, check-availability, abort

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted runs before vi.mock hoisting)
// ---------------------------------------------------------------------------

const { mockSpawn, mockExecSync } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
  mockExecSync: vi.fn()
}))

vi.mock('child_process', () => {
  const mod = { spawn: mockSpawn, execSync: mockExecSync, ChildProcess: class {} }
  return { ...mod, default: mod }
})

vi.mock('electron', () => ({
  default: {},
  ipcMain: { handle: vi.fn() },
  BrowserWindow: vi.fn()
}))

import {
  checkClaudeAvailability,
  sendMessage,
  abortClaude,
  _getActiveProcess
} from './claude.ipc'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockProcess(): EventEmitter & {
  stdout: EventEmitter
  stderr: EventEmitter
  kill: ReturnType<typeof vi.fn>
  pid: number
} {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
    pid: number
  }
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.kill = vi.fn()
  proc.pid = 12345
  return proc
}

function createMockWindow(): { webContents: { send: ReturnType<typeof vi.fn> } } {
  return { webContents: { send: vi.fn() } }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  abortClaude()
})

// ---------------------------------------------------------------------------
// checkClaudeAvailability
// ---------------------------------------------------------------------------

describe('checkClaudeAvailability', () => {
  it('returns true when claude CLI is installed', () => {
    mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/claude'))
    expect(checkClaudeAvailability()).toBe(true)
    expect(mockExecSync).toHaveBeenCalledWith('which claude', { stdio: 'ignore' })
  })

  it('returns false when claude CLI is not installed', () => {
    mockExecSync.mockImplementation(() => { throw new Error('Command not found') })
    expect(checkClaudeAvailability()).toBe(false)
  })

  it('returns false on any unexpected error', () => {
    mockExecSync.mockImplementation(() => { throw new Error('Permission denied') })
    expect(checkClaudeAvailability()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe('sendMessage', () => {
  let mockProcess: ReturnType<typeof createMockProcess>
  let mockWindow: ReturnType<typeof createMockWindow>

  beforeEach(() => {
    mockProcess = createMockProcess()
    mockSpawn.mockReturnValue(mockProcess)
    mockWindow = createMockWindow()
  })

  it('spawns claude CLI with correct arguments', () => {
    // Fire-and-forget: settle the promise to avoid unhandled rejection
    const p = sendMessage(mockWindow as never, 'Hello Claude')
    mockProcess.emit('close', 0)
    p.catch(() => {})

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      ['-p', 'Hello Claude', '--output-format', 'stream-json'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    )
  })

  it('includes --system flag when systemPrompt provided', () => {
    const p = sendMessage(mockWindow as never, 'Hello', 'You are a helper')
    mockProcess.emit('close', 0)
    p.catch(() => {})

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      ['-p', 'Hello', '--system', 'You are a helper', '--output-format', 'stream-json'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    )
  })

  it('streams stdout chunks to renderer via webContents.send', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')

    mockProcess.stdout.emit('data', Buffer.from('{"type":"assistant","text":"Hello"}'))
    mockProcess.stdout.emit('data', Buffer.from('\n{"type":"assistant","text":" world"}'))
    mockProcess.emit('close', 0)

    const result = await promise

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'claude:stream-chunk',
      '{"type":"assistant","text":"Hello"}'
    )
    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'claude:stream-chunk',
      '\n{"type":"assistant","text":" world"}'
    )
    expect(result).toBe(
      '{"type":"assistant","text":"Hello"}' +
      '\n{"type":"assistant","text":" world"}'
    )
  })

  it('sends stderr output as stream-error events', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.stderr.emit('data', Buffer.from('Warning: rate limited'))
    mockProcess.emit('close', 0)
    await promise

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'claude:stream-error',
      'Warning: rate limited'
    )
  })

  it('resolves with full response on exit code 0', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.stdout.emit('data', Buffer.from('Complete response'))
    mockProcess.emit('close', 0)
    expect(await promise).toBe('Complete response')
  })

  it('rejects with error on non-zero exit code', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.emit('close', 1)
    await expect(promise).rejects.toThrow('Claude CLI exited with code 1')
  })

  it('rejects when process emits error event', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.emit('error', new Error('spawn ENOENT'))
    await expect(promise).rejects.toThrow('spawn ENOENT')
  })

  it('clears active process on successful close', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.emit('close', 0)
    await promise
    expect(_getActiveProcess()).toBeNull()
  })

  it('clears active process on error', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.emit('error', new Error('fail'))
    try { await promise } catch { /* expected */ }
    expect(_getActiveProcess()).toBeNull()
  })

  it('clears active process on non-zero exit', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.emit('close', 2)
    try { await promise } catch { /* expected */ }
    expect(_getActiveProcess()).toBeNull()
  })

  it('handles empty response (no stdout data)', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    mockProcess.emit('close', 0)
    expect(await promise).toBe('')
  })

  it('handles multiple rapid chunks', async () => {
    const promise = sendMessage(mockWindow as never, 'Hello')
    for (const chunk of ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5']) {
      mockProcess.stdout.emit('data', Buffer.from(chunk))
    }
    mockProcess.emit('close', 0)
    expect(await promise).toBe('chunk1chunk2chunk3chunk4chunk5')
    expect(mockWindow.webContents.send).toHaveBeenCalledTimes(5)
  })
})

// ---------------------------------------------------------------------------
// abortClaude
// ---------------------------------------------------------------------------

describe('abortClaude', () => {
  let mockProcess: ReturnType<typeof createMockProcess>
  let mockWindow: ReturnType<typeof createMockWindow>

  beforeEach(() => {
    mockProcess = createMockProcess()
    mockSpawn.mockReturnValue(mockProcess)
    mockWindow = createMockWindow()
  })

  it('kills active process with SIGTERM', () => {
    const p = sendMessage(mockWindow as never, 'Hello')
    abortClaude()
    // Settle the dangling promise
    mockProcess.emit('close', null)
    p.catch(() => {})
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('clears active process reference after abort', () => {
    const p = sendMessage(mockWindow as never, 'Hello')
    abortClaude()
    mockProcess.emit('close', null)
    p.catch(() => {})
    expect(_getActiveProcess()).toBeNull()
  })

  it('does nothing when no active process', () => {
    expect(() => abortClaude()).not.toThrow()
  })

  it('is idempotent - calling twice does not throw', () => {
    const p = sendMessage(mockWindow as never, 'Hello')
    abortClaude()
    abortClaude()
    mockProcess.emit('close', null)
    p.catch(() => {})
    expect(mockProcess.kill).toHaveBeenCalledTimes(1)
  })
})
