// @TASK P4-S1-T1 - Work Store Zustand Store
// @SPEC docs/planning/03-user-flow.md#workspace
// @TEST src/pages/Workspace.test.tsx

import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { Work, WorkStatus, WorkType } from '../types/work'

// ---------------------------------------------------------------------------
// Filter type
// ---------------------------------------------------------------------------

export interface WorkFilter {
  status?: WorkStatus
  type?: WorkType
  search?: string
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface WorkState {
  works: Work[]
  loading: boolean
  error: string | null
  filter: WorkFilter
  setFilter: (filter: Partial<WorkFilter>) => void
  fetchWorks: () => Promise<void>
  deleteWork: (id: number) => Promise<void>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkStore = create<WorkState>((set, get) => ({
  works: [],
  loading: false,
  error: null,
  filter: {},

  setFilter: (filter: Partial<WorkFilter>) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }))
    get().fetchWorks()
  },

  fetchWorks: async () => {
    set({ loading: true, error: null })
    try {
      const { filter } = get()
      const filters: Record<string, unknown> = {}
      if (filter.status) filters.status = filter.status
      if (filter.type) filters.type = filter.type
      if (filter.search) filters.search = filter.search
      const works = await ipc.invoke<Work[]>('work:get-all', { filters })
      set({ works, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  deleteWork: async (id: number) => {
    await ipc.invoke('work:delete', id)
    get().fetchWorks()
  },
}))

// ---------------------------------------------------------------------------
// Helper: labels
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<WorkStatus | 'all', string> = {
  all: '전체',
  draft: '초안',
  completed: '완료',
  exported: '내보냄',
}

export const TYPE_LABELS: Record<WorkType | 'all', string> = {
  all: '전체',
  skill: '스킬',
  agent: '에이전트',
  orchestration: '오케스트레이션',
}
