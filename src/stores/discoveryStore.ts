import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { Artifact, ArtifactFilter, PipelineConfig } from '../types/artifact'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscoveryState {
  // Data
  artifacts: Artifact[]
  runs: string[]
  config: PipelineConfig | null
  setupOk: boolean
  // UI state
  filter: ArtifactFilter
  loading: boolean
  error: string | null
  pipelineRunning: boolean
  pipelineLog: string
  // Actions
  loadConfig: () => Promise<void>
  saveConfig: (config: PipelineConfig) => Promise<void>
  checkSetup: () => Promise<boolean>
  runPipeline: () => Promise<void>
  runReview: (runId: string) => Promise<void>
  importRun: (runId: string) => Promise<void>
  fetchRuns: () => Promise<void>
  fetchArtifacts: () => Promise<void>
  setFilter: (filter: Partial<ArtifactFilter>) => void
  verifyArtifact: (id: number, notes?: string) => Promise<void>
  rejectArtifact: (id: number, notes?: string) => Promise<void>
  promoteArtifact: (id: number) => Promise<void>
  deleteArtifact: (id: number) => Promise<void>
  appendLog: (text: string) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  artifacts: [],
  runs: [],
  config: null,
  setupOk: false,
  filter: {},
  loading: false,
  error: null,
  pipelineRunning: false,
  pipelineLog: '',

  loadConfig: async () => {
    try {
      const config = await ipc.invoke<PipelineConfig | null>('discovery:get-config')
      set({ config })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  saveConfig: async (config: PipelineConfig) => {
    try {
      await ipc.invoke('discovery:set-config', config)
      set({ config })
      await get().checkSetup()
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  checkSetup: async () => {
    try {
      const result = await ipc.invoke<{ ok: boolean; error?: string }>('discovery:check-setup')
      set({ setupOk: result.ok, error: result.ok ? null : result.error || null })
      return result.ok
    } catch (err) {
      set({ setupOk: false, error: (err as Error).message })
      return false
    }
  },

  runPipeline: async () => {
    set({ pipelineRunning: true, pipelineLog: '', error: null })
    try {
      await ipc.invoke('discovery:run-pipeline')
      await get().fetchRuns()
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ pipelineRunning: false })
    }
  },

  runReview: async (runId: string) => {
    set({ pipelineRunning: true, pipelineLog: '', error: null })
    try {
      await ipc.invoke('discovery:run-review', runId)
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ pipelineRunning: false })
    }
  },

  importRun: async (runId: string) => {
    set({ loading: true, error: null })
    try {
      await ipc.invoke('discovery:import-run', runId)
      await get().fetchRuns()
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  fetchRuns: async () => {
    try {
      const runs = await ipc.invoke<string[]>('discovery:get-runs')
      set({ runs })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  fetchArtifacts: async () => {
    set({ loading: true, error: null })
    try {
      const artifacts = await ipc.invoke<Artifact[]>('discovery:get-artifacts', get().filter)
      set({ artifacts, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  setFilter: (partial: Partial<ArtifactFilter>) => {
    set((state) => ({ filter: { ...state.filter, ...partial } }))
    get().fetchArtifacts()
  },

  verifyArtifact: async (id: number, notes?: string) => {
    try {
      await ipc.invoke('discovery:verify', id, notes)
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  rejectArtifact: async (id: number, notes?: string) => {
    try {
      await ipc.invoke('discovery:reject', id, notes)
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  promoteArtifact: async (id: number) => {
    try {
      await ipc.invoke('discovery:promote', id)
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  deleteArtifact: async (id: number) => {
    try {
      await ipc.invoke('discovery:delete', id)
      await get().fetchArtifacts()
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  appendLog: (text: string) => {
    set((state) => {
      const MAX_LOG = 100_000 // 100KB cap
      let log = state.pipelineLog + text
      if (log.length > MAX_LOG) {
        log = '...(truncated)\n' + log.slice(-MAX_LOG)
      }
      return { pipelineLog: log }
    })
  }
}))
