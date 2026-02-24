// @TASK P3-S1-T2 - Guide Dialogue Integration Tests (TDD)
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock IPC before any imports
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

import { ipc } from '../lib/ipc'
import GuideDialogue from './GuideDialogue'
import { useGuideStore } from '../stores/guideStore'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockWork = {
  id: 1,
  name: '코드 리뷰 에이전트',
  type: 'agent' as const,
  base_pattern_id: null,
  status: 'draft' as const,
  export_path: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockWorkWithPattern = {
  ...mockWork,
  id: 2,
  name: '패턴 기반 스킬',
  type: 'skill' as const,
  base_pattern_id: 10,
}

const mockSession = {
  id: 1,
  work_id: 1,
  current_step: 'step1' as const,
  conversation_log: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockPattern = {
  id: 10,
  name: '기본 스킬 패턴',
  type: 'skill' as const,
  description: '이것은 기본 스킬 패턴 설명입니다.',
  source: 'internal' as const,
  source_url: null,
  structure_preview: null,
  file_path: '/patterns/skill.md',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PreviewSpy() {
  return <div data-testid="preview-page">미리보기 페이지</div>
}

function renderApp(workId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/guide/${workId}`]}>
      <Routes>
        <Route path="/guide/:workId" element={<GuideDialogue />} />
        <Route path="/guide/:workId/preview" element={<PreviewSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

function setupDefaultMocks({
  work = mockWork,
  session = mockSession as typeof mockSession | null,
  pattern = null as typeof mockPattern | null,
  existingMessages = [] as Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>,
  createSession = mockSession,
  claudeAvailable = true,
  claudeResponse = 'Claude의 응답입니다.',
}: {
  work?: typeof mockWork | null
  session?: typeof mockSession | null
  pattern?: typeof mockPattern | null
  existingMessages?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  createSession?: typeof mockSession
  claudeAvailable?: boolean
  claudeResponse?: string
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
    if (channel === 'work:get-by-id') return Promise.resolve(work)
    if (channel === 'claude:check-availability') return Promise.resolve(claudeAvailable)
    if (channel === 'guide:get-by-work-id') return Promise.resolve(session)
    if (channel === 'guide:create') return Promise.resolve(createSession)
    if (channel === 'guide:get-conversation') return Promise.resolve(existingMessages)
    if (channel === 'guide:update-step') return Promise.resolve({ ...mockSession, current_step: args[1] })
    if (channel === 'guide:add-message') return Promise.resolve(mockSession)
    if (channel === 'pattern:get-by-id') return Promise.resolve(pattern)
    if (channel === 'claude:send-message') return Promise.resolve(claudeResponse)
    return Promise.resolve(null)
  })
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe('GuideDialogue Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGuideStore.setState({
      work: null,
      session: null,
      basePattern: null,
      messages: [],
      currentStep: 1,
      isStreaming: false,
      claudeAvailable: false,
      designState: {},
      loading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ========================================================================
  // 시나리오 1: 패턴 기반 시작
  // ========================================================================

  describe('시나리오 1: 패턴 기반 시작', () => {
    it('작업 + 세션 + 패턴을 로드하고 패턴 정보를 표시한다', async () => {
      setupDefaultMocks({
        work: mockWorkWithPattern,
        pattern: mockPattern,
      })
      renderApp('2')

      await waitFor(() =>
        expect(screen.getByText('기반 패턴')).toBeInTheDocument()
      )
      expect(screen.getByText('기본 스킬 패턴')).toBeInTheDocument()
      expect(screen.getByText('이것은 기본 스킬 패턴 설명입니다.')).toBeInTheDocument()
    })

    it('패턴 기반 시작 시 work:get-by-id와 guide:get-by-work-id가 호출된다', async () => {
      setupDefaultMocks({ work: mockWorkWithPattern, pattern: mockPattern })
      renderApp('2')

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:get-by-id', 2)
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('guide:get-by-work-id', 2)
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('pattern:get-by-id', 10)
      })
    })
  })

  // ========================================================================
  // 시나리오 2: 새 작업 시작 (세션 없음)
  // ========================================================================

  describe('시나리오 2: 새 작업 시작', () => {
    it('세션이 없을 때 guide:create를 호출한다', async () => {
      setupDefaultMocks({ session: null })
      renderApp()

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('guide:create', 1)
      })
    })

    it('세션 생성 후 입력창이 활성화된다', async () => {
      setupDefaultMocks({ session: null })
      renderApp()

      await waitFor(() => {
        const input = screen.getByRole('textbox', { name: '메시지 입력' })
        expect(input).not.toBeDisabled()
      })
    })
  })

  // ========================================================================
  // 시나리오 3: 메시지 전송 플로우
  // ========================================================================

  describe('시나리오 3: 메시지 전송 플로우', () => {
    it('메시지 입력 → 전송 → 사용자 메시지 표시 → Claude 응답 표시', async () => {
      setupDefaultMocks({ claudeResponse: '스킬을 만들겠습니다. 좋은 선택입니다!' })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
      )

      const input = screen.getByRole('textbox', { name: '메시지 입력' })
      fireEvent.change(input, { target: { value: '코드 리뷰 스킬을 만들고 싶어요' } })
      fireEvent.click(screen.getByRole('button', { name: '전송' }))

      // User message appears immediately
      await waitFor(() =>
        expect(screen.getByText('코드 리뷰 스킬을 만들고 싶어요')).toBeInTheDocument()
      )

      // Claude response appears after streaming (may appear in both chat bubble and design state)
      await waitFor(() =>
        expect(screen.getAllByText('스킬을 만들겠습니다. 좋은 선택입니다!').length).toBeGreaterThanOrEqual(1)
      )
    })

    it('전송 후 입력창이 비워진다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
      )

      const input = screen.getByRole('textbox', { name: '메시지 입력' })
      fireEvent.change(input, { target: { value: '테스트 메시지' } })
      fireEvent.click(screen.getByRole('button', { name: '전송' }))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('메시지 전송 시 guide:add-message가 호출된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
      )

      const input = screen.getByRole('textbox', { name: '메시지 입력' })
      fireEvent.change(input, { target: { value: '메시지 전송 테스트' } })
      fireEvent.click(screen.getByRole('button', { name: '전송' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'guide:add-message',
          1,
          expect.objectContaining({ role: 'user', content: '메시지 전송 테스트' })
        )
      })
    })

    it('Claude 응답 후 디자인 상태가 업데이트된다', async () => {
      setupDefaultMocks({ claudeResponse: '스킬 유형으로 선택되었습니다.' })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
      )

      const input = screen.getByRole('textbox', { name: '메시지 입력' })
      fireEvent.change(input, { target: { value: '스킬을 만들고 싶어요' } })
      fireEvent.click(screen.getByRole('button', { name: '전송' }))

      await waitFor(() => {
        const state = useGuideStore.getState()
        expect(state.designState.step1).toBeDefined()
      })
    })
  })

  // ========================================================================
  // 시나리오 4: 단계 이동
  // ========================================================================

  describe('시나리오 4: 단계 이동', () => {
    it('1단계 교환 후 "다음 단계" 클릭 시 2단계로 이동한다', async () => {
      setupDefaultMocks({
        existingMessages: [
          { role: 'user', content: '목적', timestamp: '2024-01-01T00:00:00Z' },
          { role: 'assistant', content: '좋습니다', timestamp: '2024-01-01T00:00:01Z' },
        ],
      })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '다음 단계' })).not.toBeDisabled()
      )

      fireEvent.click(screen.getByRole('button', { name: '다음 단계' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('guide:update-step', 1, 'step2')
      })

      await waitFor(() => {
        const state = useGuideStore.getState()
        expect(state.currentStep).toBe(2)
      })
    })

    it('2단계에서 "이전 단계" 클릭 시 1단계로 이동한다', async () => {
      setupDefaultMocks({
        existingMessages: [
          { role: 'user', content: '목적', timestamp: '2024-01-01T00:00:00Z' },
          { role: 'assistant', content: '좋습니다', timestamp: '2024-01-01T00:00:01Z' },
        ],
      })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '다음 단계' })).toBeInTheDocument()
      )

      // Move to step 2
      act(() => {
        useGuideStore.setState({ currentStep: 2 })
      })

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '이전 단계' })).not.toBeDisabled()
      )

      fireEvent.click(screen.getByRole('button', { name: '이전 단계' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('guide:update-step', 1, 'step1')
      })
    })

    it('단계 이동 시 스텝 인디케이터가 업데이트된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /1단계: 유형\/목적/ })).toHaveAttribute(
          'aria-current',
          'step'
        )
      )

      act(() => {
        useGuideStore.setState({ currentStep: 2 })
      })

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /2단계: 트리거/ })).toHaveAttribute(
          'aria-current',
          'step'
        )
      )
    })
  })

  // ========================================================================
  // 시나리오 5: 전체 플로우 → 미리보기
  // ========================================================================

  describe('시나리오 5: 전체 플로우 → 미리보기', () => {
    it('5단계에서 "완료 및 미리보기" 클릭 시 /guide/:workId/preview로 이동한다', async () => {
      setupDefaultMocks({
        existingMessages: [
          { role: 'user', content: '완료', timestamp: '2024-01-01T00:00:00Z' },
          { role: 'assistant', content: '모두 완료되었습니다.', timestamp: '2024-01-01T00:00:01Z' },
        ],
      })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
      )

      act(() => {
        useGuideStore.setState({ currentStep: 5 })
      })

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '완료 및 미리보기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '완료 및 미리보기' }))

      await waitFor(() =>
        expect(screen.getByTestId('preview-page')).toBeInTheDocument()
      )
    })
  })

  // ========================================================================
  // 에러 처리
  // ========================================================================

  describe('에러 처리', () => {
    it('work:get-by-id 실패 시 에러 메시지를 표시한다', async () => {
      vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
        if (channel === 'work:get-by-id')
          return Promise.reject(new Error('작업을 불러오지 못했습니다'))
        return Promise.resolve(null)
      })
      renderApp()

      await waitFor(() =>
        expect(screen.getByText(/작업을 불러오지 못했습니다/)).toBeInTheDocument()
      )
    })

    it('claude:send-message 실패 시에도 UI가 정상 작동한다', async () => {
      setupDefaultMocks()
      vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
        if (channel === 'work:get-by-id') return Promise.resolve(mockWork)
        if (channel === 'claude:check-availability') return Promise.resolve(true)
        if (channel === 'guide:get-by-work-id') return Promise.resolve(mockSession)
        if (channel === 'guide:get-conversation') return Promise.resolve([])
        if (channel === 'guide:add-message') return Promise.resolve(mockSession)
        if (channel === 'claude:send-message')
          return Promise.reject(new Error('Claude 오류'))
        return Promise.resolve(null)
      })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
      )

      const input = screen.getByRole('textbox', { name: '메시지 입력' })
      fireEvent.change(input, { target: { value: '오류 테스트' } })
      fireEvent.click(screen.getByRole('button', { name: '전송' }))

      // After error, input should be re-enabled (not stuck streaming)
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: '메시지 입력' })).not.toBeDisabled()
      })
    })
  })

  // ========================================================================
  // 기존 대화 복원
  // ========================================================================

  describe('기존 대화 복원', () => {
    it('기존 세션이 있을 때 이전 메시지를 표시한다', async () => {
      const existingMessages = [
        { role: 'user' as const, content: '이전에 입력한 메시지', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant' as const, content: '이전에 받은 응답', timestamp: '2024-01-01T00:00:01Z' },
      ]
      setupDefaultMocks({ existingMessages })
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('이전에 입력한 메시지')).toBeInTheDocument()
        expect(screen.getByText('이전에 받은 응답')).toBeInTheDocument()
      })
    })

    it('세션의 current_step을 반영한다', async () => {
      const sessionAtStep3 = {
        ...mockSession,
        current_step: 'step3' as const,
      }
      setupDefaultMocks({ session: sessionAtStep3 })
      renderApp()

      await waitFor(() => {
        const state = useGuideStore.getState()
        expect(state.currentStep).toBe(3)
      })
    })
  })
})
