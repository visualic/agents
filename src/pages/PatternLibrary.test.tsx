// @TASK P2-S2-T1 - Pattern Library Unit Tests
// @SPEC docs/planning/03-user-flow.md#pattern-library

import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatternLibrary from './PatternLibrary'
import { usePatternStore } from '../stores/patternStore'

// ---------------------------------------------------------------------------
// Mock the pattern store
// ---------------------------------------------------------------------------

vi.mock('../stores/patternStore')

const mockFetchPatterns = vi.fn()
const mockFetchTags = vi.fn()
const mockSetFilter = vi.fn()

const defaultStoreState = {
  patterns: [],
  tags: [],
  loading: false,
  error: null,
  filter: {},
  fetchPatterns: mockFetchPatterns,
  fetchTags: mockFetchTags,
  setFilter: mockSetFilter,
}

function setStoreState(overrides: Partial<typeof defaultStoreState>) {
  vi.mocked(usePatternStore).mockReturnValue({ ...defaultStoreState, ...overrides })
}

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
    structure_preview: '{ "steps": [...] }',
    file_path: '/skills/code-review.md',
    tag_names: 'react,typescript',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '배포 에이전트',
    type: 'agent' as const,
    description: '자동 배포 에이전트입니다.',
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
    name: '테스트 오케스트레이션',
    type: 'orchestration' as const,
    description: null,
    source: 'external' as const,
    source_url: 'https://example.com',
    structure_preview: null,
    file_path: '/orchestration/test.md',
    tag_names: '',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

const mockTags = [
  { id: 1, name: 'react', category: 'frontend' },
  { id: 2, name: 'typescript', category: 'language' },
  { id: 3, name: 'devops', category: 'ops' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter>
      <PatternLibrary />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PatternLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    setStoreState({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- Mount ----

  it('마운트 시 fetchPatterns를 호출한다', () => {
    renderPage()
    expect(mockFetchPatterns).toHaveBeenCalledTimes(1)
  })

  it('마운트 시 fetchTags를 호출한다', () => {
    renderPage()
    expect(mockFetchTags).toHaveBeenCalledTimes(1)
  })

  // ---- Breadcrumb ----

  it('브레드크럼에 홈 링크가 있다', () => {
    renderPage()
    expect(screen.getByText('홈')).toBeInTheDocument()
  })

  it('브레드크럼에 패턴 라이브러리 텍스트가 있다', () => {
    renderPage()
    // Appears in both breadcrumb and h1 – confirm at least one is present
    expect(screen.getAllByText('패턴 라이브러리').length).toBeGreaterThanOrEqual(1)
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

  it('패턴이 없으면 빈 상태 메시지를 표시한다', () => {
    setStoreState({ patterns: [] })
    renderPage()
    expect(screen.getByText(/패턴이 없습니다/i)).toBeInTheDocument()
  })

  // ---- Pattern grid ----

  it('패턴 목록을 렌더링한다', () => {
    setStoreState({ patterns: mockPatterns })
    renderPage()
    expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
    expect(screen.getByText('배포 에이전트')).toBeInTheDocument()
    expect(screen.getByText('테스트 오케스트레이션')).toBeInTheDocument()
  })

  it('각 패턴에 TypeBadge가 표시된다', () => {
    setStoreState({ patterns: mockPatterns })
    renderPage()
    // TypeBadge spans and the TypeFilter tabs both render the same Korean labels.
    // Use getAllByText – we only care that the badge is present somewhere.
    expect(screen.getAllByText('스킬').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('에이전트').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('오케스트레이션').length).toBeGreaterThanOrEqual(1)
  })

  it('패턴 설명이 표시된다', () => {
    setStoreState({ patterns: mockPatterns })
    renderPage()
    expect(screen.getByText('코드를 자동으로 리뷰합니다.')).toBeInTheDocument()
  })

  it('태그가 칩으로 표시된다', () => {
    setStoreState({ patterns: mockPatterns })
    renderPage()
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  // ---- Type filter tabs ----

  it('유형 필터 탭이 4개 렌더링된다', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '스킬' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '에이전트' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '오케스트레이션' })).toBeInTheDocument()
  })

  it('기본으로 "전체" 탭이 활성화되어 있다', () => {
    setStoreState({ filter: {} })
    renderPage()
    const allTab = screen.getByRole('tab', { name: '전체' })
    expect(allTab).toHaveAttribute('aria-selected', 'true')
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

  it('전체 탭 클릭 시 setFilter({ type: undefined })를 호출한다', () => {
    setStoreState({ filter: { type: 'skill' } })
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: '전체' }))
    expect(mockSetFilter).toHaveBeenCalledWith({ type: undefined })
  })

  // ---- Tag filter chips ----

  it('태그 목록이 칩으로 렌더링된다', () => {
    setStoreState({ tags: mockTags })
    renderPage()
    expect(screen.getByRole('button', { name: 'react' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'typescript' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'devops' })).toBeInTheDocument()
  })

  // ---- Search bar ----

  it('검색창이 렌더링된다', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/검색/i)).toBeInTheDocument()
  })

  it('검색창에 입력 시 setFilter가 debounce 후 호출된다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    renderPage()
    const input = screen.getByPlaceholderText(/검색/i)
    fireEvent.change(input, { target: { value: '코드 리뷰' } })
    // Before debounce fires, setFilter should NOT have been called
    expect(mockSetFilter).not.toHaveBeenCalled()
    // Advance past debounce window (300ms)
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(mockSetFilter).toHaveBeenCalledWith({ search: '코드 리뷰' })
    vi.useRealTimers()
  })

  // ---- PatternCard link ----

  it('패턴 카드가 /patterns/:id로 링크된다', () => {
    setStoreState({ patterns: [mockPatterns[0]] })
    renderPage()
    const link = screen.getByText('코드 리뷰 스킬').closest('a')
    expect(link).toHaveAttribute('href', '/patterns/1')
  })
})
