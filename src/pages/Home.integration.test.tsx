// @TASK P2-S1-T2 - Home Screen Integration Tests
// @SPEC docs/planning/03-user-flow.md#home-screen

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'

// ---------------------------------------------------------------------------
// Mock the IPC layer (must be before store import so the store uses the mock)
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: {
    invoke: vi.fn()
  }
}))

import { ipc } from '../lib/ipc'
import { useStatsStore } from '../stores/statsStore'

const mockSummary = {
  total_patterns: 8,
  total_works: 3,
  recent_works: [
    { id: 1, name: '첫번째 스킬', type: 'skill', status: 'draft', created_at: '2024-01-10T09:00:00Z' },
    { id: 2, name: '에이전트 패턴', type: 'agent', status: 'completed', created_at: '2024-01-11T10:00:00Z' },
    { id: 3, name: '오케스트 작업', type: 'orchestration', status: 'exported', created_at: '2024-01-12T11:00:00Z' }
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spy({ label }: { label: string }) {
  return <div data-testid="spy-page">{label}</div>
}

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/patterns" element={<Spy label="패턴 라이브러리 페이지" />} />
        <Route path="/workspace" element={<Spy label="작업실 페이지" />} />
        <Route path="/workspace/:id" element={<Spy label="작업 상세 페이지" />} />
        <Route path="/guide/new" element={<Spy label="새 작업 가이드" />} />
      </Routes>
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ipc.invoke).mockResolvedValue(mockSummary)
    // Reset Zustand store between tests so each test gets a fresh async state
    useStatsStore.setState({ stats: null, loading: false, error: null })
  })

  // ---- 시나리오 1: 초기 로드 ----

  describe('시나리오 1: 초기 로드', () => {
    it('앱 시작 시 3개의 메뉴 카드가 표시된다', async () => {
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
        expect(screen.getByText('내 작업실')).toBeInTheDocument()
        expect(screen.getByText('새로 만들기')).toBeInTheDocument()
      })
    })

    it('IPC stats:get-summary가 호출된다', async () => {
      renderApp()
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('stats:get-summary')
      })
    })

    it('통계 데이터가 로드된 후 패턴 수를 표시한다', async () => {
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument()
      })
    })

    it('통계 데이터가 로드된 후 작업 수를 표시한다', async () => {
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('최근 작업 목록이 표시된다', async () => {
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('첫번째 스킬')).toBeInTheDocument()
        expect(screen.getByText('에이전트 패턴')).toBeInTheDocument()
        expect(screen.getByText('오케스트 작업')).toBeInTheDocument()
      })
    })
  })

  // ---- 시나리오 2: 패턴 라이브러리 이동 ----

  describe('시나리오 2: 패턴 라이브러리 이동', () => {
    it('패턴 라이브러리 카드 클릭 시 /patterns로 이동한다', async () => {
      renderApp()
      const patternLink = await screen.findByText('패턴 라이브러리')
      fireEvent.click(patternLink)
      expect(screen.getByText('패턴 라이브러리 페이지')).toBeInTheDocument()
    })

    it('내 작업실 카드 클릭 시 /workspace로 이동한다', async () => {
      renderApp()
      const workspaceLink = await screen.findByText('내 작업실')
      fireEvent.click(workspaceLink)
      expect(screen.getByText('작업실 페이지')).toBeInTheDocument()
    })
  })

  // ---- 시나리오 3: 최근 작업 이동 ----

  describe('시나리오 3: 최근 작업 이동', () => {
    it('최근 작업 항목 클릭 시 /workspace/:id로 이동한다', async () => {
      renderApp()
      const workItem = await screen.findByText('첫번째 스킬')
      fireEvent.click(workItem)
      expect(screen.getByText('작업 상세 페이지')).toBeInTheDocument()
    })

    it('두번째 최근 작업 항목 클릭 시 해당 /workspace/:id로 이동한다', async () => {
      renderApp()
      const workItem = await screen.findByText('에이전트 패턴')
      fireEvent.click(workItem)
      expect(screen.getByText('작업 상세 페이지')).toBeInTheDocument()
    })
  })

  // ---- 에러 처리 ----

  describe('에러 처리', () => {
    it('IPC 오류 발생 시 에러 메시지를 표시한다', async () => {
      vi.mocked(ipc.invoke).mockRejectedValue(new Error('DB 연결 실패'))
      renderApp()
      await waitFor(() => {
        expect(screen.getByText(/DB 연결 실패/)).toBeInTheDocument()
      })
    })
  })
})
