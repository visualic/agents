// @TASK P2-S2-T2 - Pattern Library Integration Tests
// @SPEC docs/planning/03-user-flow.md#pattern-library

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock IPC before importing anything that uses it
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: {
    invoke: vi.fn(),
  },
}))

import { ipc } from '../lib/ipc'
import PatternLibrary from './PatternLibrary'
import { usePatternStore } from '../stores/patternStore'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockPatterns = [
  {
    id: 1,
    name: '코드 리뷰 스킬',
    type: 'skill' as const,
    description: '코드를 자동으로 리뷰합니다.',
    source: 'internal' as const,
    source_url: null,
    structure_preview: '{ "steps": ["review"] }',
    file_path: '/skills/code-review.md',
    tag_names: 'react,typescript',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '배포 에이전트',
    type: 'agent' as const,
    description: '자동 배포를 수행하는 에이전트입니다.',
    source: 'internal' as const,
    source_url: null,
    structure_preview: null,
    file_path: '/agents/deploy.md',
    tag_names: 'devops',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    name: '파이프라인 오케스트레이션',
    type: 'orchestration' as const,
    description: '여러 에이전트를 조율하는 패턴입니다.',
    source: 'internal' as const,
    source_url: null,
    structure_preview: null,
    file_path: '/orchestration/pipeline.md',
    tag_names: 'ci,cd',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

const mockTags = [
  { id: 1, name: 'react', category: 'frontend' },
  { id: 2, name: 'typescript', category: 'language' },
  { id: 3, name: 'devops', category: 'ops' },
]

const agentOnlyPatterns = mockPatterns.filter((p) => p.type === 'agent')
const searchPatterns = mockPatterns.filter((p) => p.name.includes('코드 리뷰'))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spy({ label }: { label: string }) {
  return <div data-testid="spy-page">{label}</div>
}

function renderApp(initialPath = '/patterns') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/patterns" element={<PatternLibrary />} />
        <Route path="/patterns/:id" element={<Spy label="패턴 상세 페이지" />} />
      </Routes>
    </MemoryRouter>
  )
}

function setupIpcMocks({
  patterns = mockPatterns,
  filteredPatterns,
  tags = mockTags,
}: {
  patterns?: typeof mockPatterns
  filteredPatterns?: typeof mockPatterns
  tags?: typeof mockTags
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation(
    (channel: string, args?: unknown) => {
      if (channel === 'tag:get-all') return Promise.resolve(tags)
      if (channel === 'pattern:get-all') {
        const payload = args as { filters?: { type?: string; search?: string } } | undefined
        const filters = payload?.filters

        // If a type filter is set and filteredPatterns provided, use that
        if (filters?.type && filteredPatterns) {
          return Promise.resolve(filteredPatterns)
        }
        // If a search filter is set
        if (filters?.search) {
          return Promise.resolve(
            patterns.filter((p) => p.name.includes(filters.search!))
          )
        }
        return Promise.resolve(patterns)
      }
      return Promise.resolve([])
    }
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PatternLibrary Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    // Reset store so each test starts fresh
    usePatternStore.setState({
      patterns: [],
      tags: [],
      loading: false,
      error: null,
      filter: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- 시나리오 1: 초기 로드 ----

  describe('시나리오 1: 초기 로드', () => {
    it('페이지 접속 시 전체 패턴 그리드가 표시된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
        expect(screen.getByText('배포 에이전트')).toBeInTheDocument()
        expect(screen.getByText('파이프라인 오케스트레이션')).toBeInTheDocument()
      })
    })

    it('전체 탭이 기본 활성화 상태이다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('IPC pattern:get-all이 호출된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'pattern:get-all',
          expect.objectContaining({ filters: expect.any(Object) })
        )
      })
    })

    it('IPC tag:get-all이 호출된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('tag:get-all')
      })
    })

    it('태그 칩 목록이 표시된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'react' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'devops' })).toBeInTheDocument()
      })
    })

    it('패턴 TypeBadge가 표시된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        // TypeFilter tabs + TypeBadge badges both render Korean type labels.
        // Use getAllByText to handle duplicates; just verify they exist.
        expect(screen.getAllByText('스킬').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('에이전트').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('오케스트레이션').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // ---- 시나리오 2: 유형 필터 ----

  describe('시나리오 2: 유형 필터', () => {
    it('"에이전트" 탭 클릭 시 에이전트 패턴만 표시된다', async () => {
      setupIpcMocks({ filteredPatterns: agentOnlyPatterns })
      renderApp()

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
      })

      // Click the 에이전트 tab
      fireEvent.click(screen.getByRole('tab', { name: '에이전트' }))

      await waitFor(() => {
        expect(screen.getByText('배포 에이전트')).toBeInTheDocument()
        expect(screen.queryByText('코드 리뷰 스킬')).not.toBeInTheDocument()
        expect(screen.queryByText('파이프라인 오케스트레이션')).not.toBeInTheDocument()
      })
    })

    it('"에이전트" 탭 클릭 후 탭이 활성화 상태로 변경된다', async () => {
      setupIpcMocks({ filteredPatterns: agentOnlyPatterns })
      renderApp()
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('tab', { name: '에이전트' }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: '에이전트' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'false')
      })
    })

    it('"전체" 탭 클릭 시 모든 패턴이 다시 표시된다', async () => {
      setupIpcMocks({ filteredPatterns: agentOnlyPatterns })
      renderApp()
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      // Filter to agent
      fireEvent.click(screen.getByRole('tab', { name: '에이전트' }))
      await waitFor(() => expect(screen.queryByText('코드 리뷰 스킬')).not.toBeInTheDocument())

      // Reset mock so "전체" returns all patterns
      setupIpcMocks()
      fireEvent.click(screen.getByRole('tab', { name: '전체' }))
      await waitFor(() => {
        expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
        expect(screen.getByText('배포 에이전트')).toBeInTheDocument()
      })
    })
  })

  // ---- 시나리오 3: 검색 ----

  describe('시나리오 3: 검색', () => {
    it('"코드 리뷰" 입력 후 debounce 경과 시 search 필터로 IPC가 재호출된다', async () => {
      // Use real timers for initial load, then switch to fake for debounce
      setupIpcMocks()
      renderApp()

      // Wait for initial patterns to load with real timers
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      // Switch to fake timers after real async has settled
      vi.useFakeTimers({ shouldAdvanceTime: false })

      const input = screen.getByPlaceholderText(/검색/i)
      fireEvent.change(input, { target: { value: '코드 리뷰' } })

      // Advance debounce timer
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // Restore real timers before any async work
      vi.useRealTimers()

      // After debounce, IPC is called again with search filter
      await waitFor(() => {
        const calls = vi.mocked(ipc.invoke).mock.calls
        const searchCall = calls.find(
          (c) => c[0] === 'pattern:get-all' &&
            (c[1] as { filters?: { search?: string } })?.filters?.search === '코드 리뷰'
        )
        expect(searchCall).toBeDefined()
      })
    })
  })

  // ---- 시나리오 4: 상세 이동 ----

  describe('시나리오 4: 상세 이동', () => {
    it('패턴 카드 클릭 시 /patterns/:id로 이동한다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      fireEvent.click(screen.getByText('코드 리뷰 스킬'))

      expect(screen.getByText('패턴 상세 페이지')).toBeInTheDocument()
    })
  })

  // ---- 에러 처리 ----

  describe('에러 처리', () => {
    it('IPC 오류 발생 시 에러 메시지를 표시한다', async () => {
      vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
        if (channel === 'pattern:get-all') return Promise.reject(new Error('DB 오류'))
        return Promise.resolve([])
      })
      renderApp()
      await waitFor(() => {
        expect(screen.getByText(/DB 오류/)).toBeInTheDocument()
      })
    })
  })
})
