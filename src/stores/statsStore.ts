// @TASK P2-S1-T1 - Stats Zustand Store
// @SPEC docs/planning/02-trd.md#stats-api

import { create } from 'zustand'
import { ipc } from '../lib/ipc'

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
  total_artifacts: number
  artifacts_pending: number
  recent_works: RecentWork[]
}

interface StatsState {
  stats: StatsSummary | null
  loading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  loading: false,
  error: null,
  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      const stats = await ipc.invoke<StatsSummary>('stats:get-summary')
      set({ stats, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  }
}))
