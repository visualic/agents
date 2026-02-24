// @TASK P4-S1-T1 - Workspace Page Unit Tests
// @SPEC docs/planning/03-user-flow.md#workspace

import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Workspace from './Workspace'
import { useWorkStore } from '../stores/workStore'

// ---------------------------------------------------------------------------
// Mock the work store
// ---------------------------------------------------------------------------

vi.mock('../stores/workStore')

const mockFetchWorks = vi.fn()
const mockSetFilter = vi.fn()
const mockDeleteWork = vi.fn()

const defaultStoreState = {
  works: [],
  loading: false,
  error: null,
  filter: {},
  fetchWorks: mockFetchWorks,
  setFilter: mockSetFilter,
  deleteWork: mockDeleteWork,
}

function setStoreState(overrides: Partial<typeof defaultStoreState>) {
  vi.mocked(useWorkStore).mockReturnValue({ ...defaultStoreState, ...overrides })
}

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter>
      <Workspace />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    setStoreState({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- Mount ----

  it('마운트 시 fetchWorks를 호출한다', () => {
    renderPage()
    expect(mockFetchWorks).toHaveBeenCalledTimes(1)
  })

  // ---- Breadcrumb ----

  it('브레드크럼에 홈 링크가 있다', () => {
    renderPage()
    expect(screen.getByText('홈')).toBeInTheDocument()
  })

  it('브레드크럼에 내 작업실 텍스트가 있다', () => {
    renderPage()
    expect(screen.getAllByText('내 작업실').length).toBeGreaterThanOrEqual(1)
  })

  // ---- Loading ----

  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    setStoreState({ loading: true })
    renderPage()
    expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()
  })

  // ---- Error ----

  it('에러 발생 시 에러 메시지를 표시한다', () => {
    setStoreState({ error: '데이터 로드 실패' })
    renderPage()
    expect(screen.getByText(/데이터 로드 실패/)).toBeInTheDocument()
  })

  // ---- Empty state ----

  it('작업물이 없으면 빈 상태 메시지를 표시한다', () => {
    setStoreState({ works: [] })
    renderPage()
    expect(screen.getByText(/작업물이 없습니다/i)).toBeInTheDocument()
  })

  // ---- Work grid ----

  it('작업물 목록을 렌더링한다', () => {
    setStoreState({ works: mockWorks })
    renderPage()
    expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
    expect(screen.getByText('배포 에이전트')).toBeInTheDocument()
    expect(screen.getByText('파이프라인 오케스트레이션')).toBeInTheDocument()
  })

  it('각 작업물에 TypeBadge가 표시된다', () => {
    setStoreState({ works: mockWorks })
    renderPage()
    expect(screen.getAllByText('스킬').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('에이전트').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('오케스트레이션').length).toBeGreaterThanOrEqual(1)
  })

  it('각 작업물에 StatusBadge가 표시된다', () => {
    setStoreState({ works: mockWorks })
    renderPage()
    // Status labels appear in both filter tabs and StatusBadge spans
    expect(screen.getAllByText('초안').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('완료').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('내보냄').length).toBeGreaterThanOrEqual(1)
  })

  // ---- Status filter tabs ----

  it('상태 필터 탭이 4개 렌더링된다', () => {
    renderPage()
    const tablist = screen.getAllByRole('tablist')[0]
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'))
    expect(tabs.length).toBe(4)
  })

  it('기본으로 상태 "전체" 탭이 활성화되어 있다', () => {
    setStoreState({ filter: {} })
    renderPage()
    const allTabs = screen.getAllByRole('tab', { name: '전체' })
    // First tablist is status, second is type
    expect(allTabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('초안 탭 클릭 시 setFilter({ status: "draft" })를 호출한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '초안' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ status: 'draft' })
  })

  it('완료 탭 클릭 시 setFilter({ status: "completed" })를 호출한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '완료' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ status: 'completed' })
  })

  it('내보냄 탭 클릭 시 setFilter({ status: "exported" })를 호출한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '내보냄' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ status: 'exported' })
  })

  it('상태 전체 탭 클릭 시 setFilter({ status: undefined })를 호출한다', () => {
    setStoreState({ filter: { status: 'draft' } })
    renderPage()
    fireEvent.click(screen.getAllByRole('tab', { name: '전체' })[0])
    expect(mockSetFilter).toHaveBeenCalledWith({ status: undefined })
  })

  // ---- Type filter tabs ----

  it('유형 필터 탭이 4개 렌더링된다', () => {
    renderPage()
    const tablists = screen.getAllByRole('tablist')
    const typeTabs = Array.from(tablists[1].querySelectorAll('[role="tab"]'))
    expect(typeTabs.length).toBe(4)
  })

  it('기본으로 유형 "전체" 탭이 활성화되어 있다', () => {
    setStoreState({ filter: {} })
    renderPage()
    const allTabs = screen.getAllByRole('tab', { name: '전체' })
    expect(allTabs[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('스킬 탭 클릭 시 setFilter({ type: "skill" })를 호출한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '스킬' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ type: 'skill' })
  })

  it('에이전트 탭 클릭 시 setFilter({ type: "agent" })를 호출한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '에이전트' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ type: 'agent' })
  })

  it('오케스트레이션 탭 클릭 시 setFilter({ type: "orchestration" })를 호출한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '오케스트레이션' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ type: 'orchestration' })
  })

  it('유형 전체 탭 클릭 시 setFilter({ type: undefined })를 호출한다', () => {
    setStoreState({ filter: { type: 'skill' } })
    renderPage()
    fireEvent.click(screen.getAllByRole('tab', { name: '전체' })[1])
    expect(mockSetFilter).toHaveBeenCalledWith({ type: undefined })
  })

  // ---- Search bar ----

  it('검색창이 렌더링된다', () => {
    renderPage()
    expect(screen.getByRole('textbox', { name: '작업물 검색' })).toBeInTheDocument()
  })

  it('검색창에 입력 시 setFilter가 debounce 후 호출된다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    renderPage()
    const input = screen.getByRole('textbox', { name: '작업물 검색' })
    fireEvent.change(input, { target: { value: '코드 리뷰' } })
    expect(mockSetFilter).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(mockSetFilter).toHaveBeenCalledWith({ search: '코드 리뷰' })
    vi.useRealTimers()
  })

  // ---- WorkCard navigation ----

  it('작업물 카드가 /workspace/:id로 링크된다', () => {
    setStoreState({ works: [mockWorks[0]] })
    renderPage()
    const link = screen.getByText('코드 리뷰 스킬').closest('a')
    expect(link).toHaveAttribute('href', '/workspace/1')
  })
})
