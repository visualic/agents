// @TASK P5-R1-T2 - Pipeline Runner (agents-casting CLI execution)
// Follows claude.ipc.ts child_process.spawn pattern

import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { BrowserWindow } from 'electron'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let activeProcess: ChildProcess | null = null

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  projectPath: string
  pythonPath?: string
  runId?: string
}

export interface PipelineResult {
  success: boolean
  runId: string
  metrics?: {
    totalIngested: number
    curatedCount: number
    reviewCount: number
    rejectedCount: number
    skillsGenerated: number
    subagentsGenerated: number
    orchestrationsGenerated: number
  }
  error?: string
}

// ---------------------------------------------------------------------------
// Pure functions (testable without Electron)
// ---------------------------------------------------------------------------

/**
 * Generate a run ID if not provided.
 */
export function generateRunId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const short = randomUUID().slice(0, 8)
  return `${date}-${short}`
}

/**
 * Validate that the agents-casting project exists at the given path.
 */
export function validateProjectPath(projectPath: string): { ok: boolean; error?: string } {
  if (!existsSync(projectPath)) {
    return { ok: false, error: 'Project path does not exist' }
  }
  if (!existsSync(join(projectPath, 'source_contract.yaml'))) {
    return { ok: false, error: 'source_contract.yaml not found — not an agents-casting project' }
  }
  return { ok: true }
}

/**
 * Run an agents-casting CLI command via child_process.spawn.
 * Streams progress to mainWindow via 'discovery:pipeline-progress' events.
 */
export function runPipeline(
  config: PipelineConfig,
  command: string,
  args: string[],
  mainWindow?: BrowserWindow | null
): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonPath = config.pythonPath || 'python3'
    const fullArgs = ['-m', 'agents_casting', command, ...args]

    const child = spawn(pythonPath, fullArgs, {
      cwd: config.projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    activeProcess = child

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('discovery:pipeline-progress', {
          type: 'stdout',
          data: text
        })
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('discovery:pipeline-progress', {
          type: 'stderr',
          data: text
        })
      }
    })

    child.on('close', (code) => {
      activeProcess = null
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Pipeline exited with code ${code}: ${stderr}`))
      }
    })

    child.on('error', (err) => {
      activeProcess = null
      reject(err)
    })
  })
}

/**
 * Abort the currently running pipeline process.
 */
export function abortPipeline(): void {
  if (activeProcess) {
    activeProcess.kill('SIGTERM')
    activeProcess = null
  }
}

/**
 * Run the full pipeline: agents-casting run-all --run-id <id>
 */
export async function runFullPipeline(
  config: PipelineConfig,
  mainWindow?: BrowserWindow | null
): Promise<PipelineResult> {
  const runId = config.runId || generateRunId()
  try {
    await runPipeline(config, 'run-all', ['--run-id', runId], mainWindow)
    return { success: true, runId }
  } catch (err) {
    return { success: false, runId, error: (err as Error).message }
  }
}

/**
 * Run auto-review policy: agents-casting review-auto --run-id <id>
 */
export async function runAutoReview(
  config: PipelineConfig,
  runId: string,
  mainWindow?: BrowserWindow | null
): Promise<PipelineResult> {
  try {
    await runPipeline(config, 'review-auto', ['--run-id', runId], mainWindow)
    return { success: true, runId }
  } catch (err) {
    return { success: false, runId, error: (err as Error).message }
  }
}

/**
 * Check pipeline setup: validate Python + project path.
 */
export async function checkPipelineSetup(
  config: PipelineConfig
): Promise<{ ok: boolean; error?: string }> {
  const pathCheck = validateProjectPath(config.projectPath)
  if (!pathCheck.ok) return pathCheck

  try {
    await runPipeline(config, 'show-settings', [])
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Pipeline check failed: ${(err as Error).message}` }
  }
}
