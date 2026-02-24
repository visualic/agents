// @TASK P2-S2-T1 - Pattern Library Zustand Store
// @SPEC docs/planning/03-user-flow.md#pattern-library
// @TEST src/pages/PatternLibrary.test.tsx

import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { Pattern, PatternFilter, PatternType } from '../types/pattern'

// ---------------------------------------------------------------------------
// Tag type
// ---------------------------------------------------------------------------

export interface Tag {
  id: number
  name: string
  category: string | null
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface PatternState {
  patterns: Pattern[]
  tags: Tag[]
  loading: boolean
  error: string | null
  filter: PatternFilter
  setFilter: (filter: Partial<PatternFilter>) => void
  fetchPatterns: () => Promise<void>
  fetchTags: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePatternStore = create<PatternState>((set, get) => ({
  patterns: [],
  tags: [],
  loading: false,
  error: null,
  filter: {},

  setFilter: (filter: Partial<PatternFilter>) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }))
    get().fetchPatterns()
  },

  fetchPatterns: async () => {
    set({ loading: true, error: null })
    try {
      const { filter } = get()
      // Build args – omit undefined fields so IPC doesn't get noisy keys
      const filters: Record<string, unknown> = {}
      if (filter.type) filters.type = filter.type
      if (filter.search) filters.search = filter.search
      if (filter.tags && filter.tags.length > 0) filters.tag_id = filter.tags[0]

      const patterns = await ipc.invoke<Pattern[]>('pattern:get-all', { filters })
      set({ patterns, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchTags: async () => {
    try {
      const tags = await ipc.invoke<Tag[]>('tag:get-all')
      set({ tags })
    } catch {
      // Tags are supplementary – swallow error, don't block the UI
    }
  },
}))

// ---------------------------------------------------------------------------
// Helper: map PatternType → Korean label
// ---------------------------------------------------------------------------

export const TYPE_LABELS: Record<PatternType | 'all', string> = {
  all: '전체',
  skill: '스킬',
  agent: '에이전트',
  orchestration: '오케스트레이션',
}
