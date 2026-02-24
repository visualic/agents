// @TASK P4-S1-T2 - Workspace Integration Tests
// @SPEC docs/planning/03-user-flow.md#workspace

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock IPC before importing anything that uses it
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

import { ipc } from '../lib/ipc'
import Workspace from './Workspace'
import { useWorkStore } from '../stores/workStore'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockWorks = [
  {
    id: 1,
    name: '코드 리뷰 스킬',
    type: 'skill' as const,
    base_pattern_id: null,
    status: 'draft' as const,
    export_path: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 2,
    name: '배포 에이전트',
    type: 'agent' as const,
    base_pattern_id: 3,
    status: 'completed' as const,
    export_path: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 3,
    name: '파이프라인 오케스트레이션',
    type: 'orchestration' as const,
    base_pattern_id: null,
    status: 'exported' as const,
    export_path: '/exports/pipeline.zip',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
]

const exportedOnlyWorks = mockWorks.filter((w) => w.status === 'exported')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spy({ label }: { label: string }) {
  return <div data-testid="spy-page">{label}</div>
}

function renderApp(initialPath = '/workspace') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Spy label="작업 상세 페이지" />} />
      </Routes>
    </MemoryRouter>
  )
}

function setupIpcMocks({
  works = mockWorks,
  filteredWorks,
}: {
  works?: typeof mockWorks
  filteredWorks?: typeof mockWorks
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation(
    (channel: string, args?: unknown) => {
      if (channel === 'work:get-all') {
        const payload = args as { filters?: { status?: string; type?: string; search?: string } } | undefined
        const filters = payload?.filters

        if (filters?.status && filteredWorks) {
          return Promise.resolve(filteredWorks)
        }
        if (filters?.type && filteredWorks) {
          return Promise.resolve(filteredWorks)
        }
        if (filters?.search) {
          return Promise.resolve(
            works.filter((w) => w.name.includes(filters.search!))
          )
        }
        return Promise.resolve(works)
      }
      return Promise.resolve([])
    }
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workspace Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    // Reset store so each test starts fresh
    useWorkStore.setState({
      works: [],
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
    it('페이지 접속 시 전체 작업물 그리드가 표시된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
        expect(screen.getByText('배포 에이전트')).toBeInTheDocument()
        expect(screen.getByText('파이프라인 오케스트레이션')).toBeInTheDocument()
      })
    })

    it('상태 전체 탭이 기본 활성화 상태이다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        const allTabs = screen.getAllByRole('tab', { name: '전체' })
        expect(allTabs[0]).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('IPC work:get-all이 호출된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'work:get-all',
          expect.objectContaining({ filters: expect.any(Object) })
        )
      })
    })

    it('작업물 TypeBadge가 표시된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getAllByText('스킬').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('에이전트').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('오케스트레이션').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('작업물 StatusBadge가 표시된다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getAllByText('초안').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('완료').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('내보냄').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // ---- 시나리오 2: 상태 필터 ----

  describe('시나리오 2: 상태 필터', () => {
    it('"내보냄" 탭 클릭 시 내보낸 작업물만 표시된다', async () => {
      setupIpcMocks({ filteredWorks: exportedOnlyWorks })
      renderApp()

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
      })

      // Click the 내보냄 status tab
      fireEvent.click(screen.getByRole('tab', { name: '내보냄' }))

      await waitFor(() => {
        expect(screen.getByText('파이프라인 오케스트레이션')).toBeInTheDocument()
        expect(screen.queryByText('코드 리뷰 스킬')).not.toBeInTheDocument()
        expect(screen.queryByText('배포 에이전트')).not.toBeInTheDocument()
      })
    })

    it('"내보냄" 탭 클릭 시 IPC가 status 필터로 호출된다', async () => {
      setupIpcMocks({ filteredWorks: exportedOnlyWorks })
      renderApp()

      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('tab', { name: '내보냄' }))

      await waitFor(() => {
        const calls = vi.mocked(ipc.invoke).mock.calls
        const statusCall = calls.find(
          (c) =>
            c[0] === 'work:get-all' &&
            (c[1] as { filters?: { status?: string } })?.filters?.status === 'exported'
        )
        expect(statusCall).toBeDefined()
      })
    })

    it('"내보냄" 탭 클릭 후 탭이 활성화 상태로 변경된다', async () => {
      setupIpcMocks({ filteredWorks: exportedOnlyWorks })
      renderApp()
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('tab', { name: '내보냄' }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: '내보냄' })).toHaveAttribute('aria-selected', 'true')
        // 전체 tab (first tablist, index 0)
        const allTabs = screen.getAllByRole('tab', { name: '전체' })
        expect(allTabs[0]).toHaveAttribute('aria-selected', 'false')
      })
    })
  })

  // ---- 시나리오 3: 상세 이동 ----

  describe('시나리오 3: 상세 이동', () => {
    it('작업물 카드 클릭 시 /workspace/:id로 이동한다', async () => {
      setupIpcMocks()
      renderApp()
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      fireEvent.click(screen.getByText('코드 리뷰 스킬'))

      expect(screen.getByText('작업 상세 페이지')).toBeInTheDocument()
    })
  })

  // ---- 에러 처리 ----

  describe('에러 처리', () => {
    it('IPC 오류 발생 시 에러 메시지를 표시한다', async () => {
      vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
        if (channel === 'work:get-all') return Promise.reject(new Error('DB 오류'))
        return Promise.resolve([])
      })
      renderApp()
      await waitFor(() => {
        expect(screen.getByText(/DB 오류/)).toBeInTheDocument()
      })
    })
  })

  // ---- 검색 ----

  describe('검색', () => {
    it('"코드 리뷰" 입력 후 debounce 경과 시 search 필터로 IPC가 재호출된다', async () => {
      setupIpcMocks()
      renderApp()

      // Wait for initial load
      await waitFor(() => expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument())

      // Switch to fake timers for debounce
      vi.useFakeTimers({ shouldAdvanceTime: false })

      const input = screen.getByRole('textbox', { name: '작업물 검색' })
      fireEvent.change(input, { target: { value: '코드 리뷰' } })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      vi.useRealTimers()

      await waitFor(() => {
        const calls = vi.mocked(ipc.invoke).mock.calls
        const searchCall = calls.find(
          (c) =>
            c[0] === 'work:get-all' &&
            (c[1] as { filters?: { search?: string } })?.filters?.search === '코드 리뷰'
        )
        expect(searchCall).toBeDefined()
      })
    })
  })
})
