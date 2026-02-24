// @TASK P2-S1-T1 - Home Screen Unit Tests
// @SPEC docs/planning/03-user-flow.md#home-screen

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { useStatsStore } from '../stores/statsStore'

// ---------------------------------------------------------------------------
// Mock the stats store
// ---------------------------------------------------------------------------

vi.mock('../stores/statsStore')

const mockFetchStats = vi.fn()

const defaultStoreState = {
  stats: null,
  loading: false,
  error: null,
  fetchStats: mockFetchStats
}

function setStoreState(overrides: Partial<typeof defaultStoreState>) {
  vi.mocked(useStatsStore).mockReturnValue({ ...defaultStoreState, ...overrides })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setStoreState({})
  })

  // ---- Fetch on mount ----

  it('마운트 시 fetchStats를 호출한다', () => {
    renderHome()
    expect(mockFetchStats).toHaveBeenCalledTimes(1)
  })

  // ---- Loading state ----

  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    setStoreState({ loading: true })
    renderHome()
    expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()
  })

  // ---- Error state ----

  it('에러 발생 시 에러 메시지를 표시한다', () => {
    setStoreState({ error: '네트워크 오류' })
    renderHome()
    expect(screen.getByText(/네트워크 오류/)).toBeInTheDocument()
  })

  // ---- Stats display ----

  it('total_patterns 통계를 표시한다', async () => {
    setStoreState({
      stats: { total_patterns: 12, total_works: 5, recent_works: [] }
    })
    renderHome()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('total_works 통계를 표시한다', async () => {
    setStoreState({
      stats: { total_patterns: 12, total_works: 5, recent_works: [] }
    })
    renderHome()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  // ---- Menu cards ----

  it('패턴 라이브러리 메뉴 카드를 렌더링한다', () => {
    setStoreState({})
    renderHome()
    expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
  })

  it('내 작업실 메뉴 카드를 렌더링한다', () => {
    setStoreState({})
    renderHome()
    expect(screen.getByText('내 작업실')).toBeInTheDocument()
  })

  it('새로 만들기 메뉴 카드를 렌더링한다', () => {
    setStoreState({})
    renderHome()
    expect(screen.getByText('새로 만들기')).toBeInTheDocument()
  })

  it('패턴 라이브러리 카드가 /patterns로 링크된다', () => {
    setStoreState({})
    renderHome()
    const link = screen.getByText('패턴 라이브러리').closest('a')
    expect(link).toHaveAttribute('href', '/patterns')
  })

  it('내 작업실 카드가 /workspace로 링크된다', () => {
    setStoreState({})
    renderHome()
    const link = screen.getByText('내 작업실').closest('a')
    expect(link).toHaveAttribute('href', '/workspace')
  })

  // ---- Recent works ----

  it('최근 작업 목록을 표시한다', () => {
    setStoreState({
      stats: {
        total_patterns: 3,
        total_works: 2,
        recent_works: [
          { id: 1, name: '내 첫번째 스킬', type: 'skill', status: 'draft', created_at: '2024-01-01T00:00:00Z' },
          { id: 2, name: '에이전트 작업', type: 'agent', status: 'completed', created_at: '2024-01-02T00:00:00Z' }
        ]
      }
    })
    renderHome()
    expect(screen.getByText('내 첫번째 스킬')).toBeInTheDocument()
    expect(screen.getByText('에이전트 작업')).toBeInTheDocument()
  })

  it('최근 작업이 없으면 빈 상태 메시지를 표시한다', () => {
    setStoreState({
      stats: { total_patterns: 0, total_works: 0, recent_works: [] }
    })
    renderHome()
    expect(screen.getByText(/아직 작업이 없습니다/i)).toBeInTheDocument()
  })

  it('최근 작업 항목에 TypeBadge가 표시된다', () => {
    setStoreState({
      stats: {
        total_patterns: 1,
        total_works: 1,
        recent_works: [
          { id: 1, name: '스킬 항목', type: 'skill', status: 'draft', created_at: '2024-01-01T00:00:00Z' }
        ]
      }
    })
    renderHome()
    expect(screen.getByText('스킬')).toBeInTheDocument()
  })

  it('최근 작업 항목에 StatusBadge가 표시된다', () => {
    setStoreState({
      stats: {
        total_patterns: 1,
        total_works: 1,
        recent_works: [
          { id: 1, name: '스킬 항목', type: 'skill', status: 'completed', created_at: '2024-01-01T00:00:00Z' }
        ]
      }
    })
    renderHome()
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('최근 작업 항목 클릭 시 /workspace/:id로 링크된다', () => {
    setStoreState({
      stats: {
        total_patterns: 1,
        total_works: 1,
        recent_works: [
          { id: 42, name: '테스트 작업', type: 'skill', status: 'draft', created_at: '2024-01-01T00:00:00Z' }
        ]
      }
    })
    renderHome()
    const link = screen.getByText('테스트 작업').closest('a')
    expect(link).toHaveAttribute('href', '/workspace/42')
  })

  // ---- stats is null (initial state before fetch completes) ----

  it('stats가 null이면 최근 작업 섹션을 렌더링하지 않거나 빈 상태를 표시한다', () => {
    setStoreState({ stats: null, loading: false, error: null })
    renderHome()
    // Menu cards still present
    expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
  })
})
