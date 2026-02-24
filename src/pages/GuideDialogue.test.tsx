// @TASK P3-S1-T1 - Guide Dialogue Unit Tests (TDD)
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock IPC before any imports that use it
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ workId: '1' }),
    useNavigate: () => mockNavigate,
  }
})

import { ipc } from '../lib/ipc'
import GuideDialogue from './GuideDialogue'
import { useGuideStore } from '../stores/guideStore'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockWork = {
  id: 1,
  name: '코드 리뷰 스킬',
  type: 'skill' as const,
  base_pattern_id: null,
  status: 'draft' as const,
  export_path: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockWorkWithPattern = {
  ...mockWork,
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
  description: '이것은 기본 스킬 패턴입니다.',
  source: 'internal' as const,
  source_url: null,
  structure_preview: null,
  file_path: '/patterns/skill.md',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockMessages = [
  {
    role: 'user' as const,
    content: '안녕하세요',
    timestamp: '2024-01-01T00:00:01Z',
  },
  {
    role: 'assistant' as const,
    content: '안녕하세요! 무엇을 만들어볼까요?',
    timestamp: '2024-01-01T00:00:02Z',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks({
  work = mockWork,
  session = mockSession,
  pattern = null as typeof mockPattern | null,
  messages = [] as typeof mockMessages,
  claudeAvailable = true,
}: {
  work?: typeof mockWork | null
  session?: typeof mockSession | null
  pattern?: typeof mockPattern | null
  messages?: typeof mockMessages
  claudeAvailable?: boolean
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
    if (channel === 'work:get-by-id') return Promise.resolve(work)
    if (channel === 'claude:check-availability') return Promise.resolve(claudeAvailable)
    if (channel === 'guide:get-by-work-id') return Promise.resolve(session)
    if (channel === 'guide:create') return Promise.resolve(mockSession)
    if (channel === 'guide:get-conversation') return Promise.resolve(messages)
    if (channel === 'guide:update-step') return Promise.resolve(session)
    if (channel === 'guide:add-message') return Promise.resolve(session)
    if (channel === 'pattern:get-by-id') return Promise.resolve(pattern)
    if (channel === 'claude:send-message') return Promise.resolve('AI의 응답입니다.')
    return Promise.resolve(null)
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GuideDialogue />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuideDialogue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset zustand store between tests
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

  // ---- 1. Loading state ----

  it('작업 데이터를 불러오는 동안 로딩 상태를 표시한다', () => {
    vi.mocked(ipc.invoke).mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()
  })

  // ---- 2. 5-step indicator ----

  it('5단계 스텝 인디케이터를 렌더링한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: '가이드 단계' })).toBeInTheDocument()
    )
    // All 5 step labels should be present
    expect(screen.getByText('유형/목적')).toBeInTheDocument()
    expect(screen.getByText('트리거')).toBeInTheDocument()
    expect(screen.getByText('구조')).toBeInTheDocument()
    expect(screen.getByText('도구/권한')).toBeInTheDocument()
    expect(screen.getByText('미리보기')).toBeInTheDocument()
  })

  it('1단계가 활성화된 상태로 표시된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /1단계: 유형\/목적/ })).toBeInTheDocument()
    )
    const step1Btn = screen.getByRole('button', { name: /1단계: 유형\/목적/ })
    expect(step1Btn).toHaveAttribute('aria-current', 'step')
  })

  // ---- 3. Chat area ----

  it('메시지 목록과 함께 채팅 영역을 렌더링한다', async () => {
    setupMocks({ messages: mockMessages })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('안녕하세요')).toBeInTheDocument()
    )
    expect(screen.getByText('안녕하세요! 무엇을 만들어볼까요?')).toBeInTheDocument()
  })

  it('채팅 영역이 role="log"를 가진다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('log')).toBeInTheDocument()
    )
  })

  // ---- 4. User input and submit button ----

  it('사용자 입력창과 전송 버튼을 렌더링한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: '전송' })).toBeInTheDocument()
  })

  // ---- 5. Design state panel ----

  it('사이드바에 디자인 상태 패널을 렌더링한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('complementary', { name: '디자인 상태 패널' })).toBeInTheDocument()
    )
  })

  // ---- 6. Base pattern info (pattern-based) ----

  it('기반 패턴이 있을 때 패턴 정보를 표시한다', async () => {
    setupMocks({ work: mockWorkWithPattern, pattern: mockPattern })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('기반 패턴')).toBeInTheDocument()
    )
    expect(screen.getByText('기본 스킬 패턴')).toBeInTheDocument()
    expect(screen.getByText('이것은 기본 스킬 패턴입니다.')).toBeInTheDocument()
  })

  // ---- 7. No base pattern (new creation) ----

  it('기반 패턴 없이 새 작업 생성 시 패턴 정보 섹션이 표시되지 않는다', async () => {
    setupMocks({ work: mockWork, pattern: null })
    renderPage()
    await waitFor(() =>
      expect(screen.queryByText('기반 패턴')).not.toBeInTheDocument()
    )
  })

  // ---- 8. Streaming indicator ----

  it('AI 응답 스트리밍 중에 스트리밍 인디케이터를 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )

    // Set streaming state directly
    act(() => {
      useGuideStore.setState({ isStreaming: true })
    })

    await waitFor(() =>
      expect(screen.getByLabelText('AI 응답 중')).toBeInTheDocument()
    )
  })

  // ---- 9. Input disabled during streaming ----

  it('스트리밍 중에 입력창이 비활성화된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )

    act(() => {
      useGuideStore.setState({ isStreaming: true })
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeDisabled()
    })
  })

  // ---- 10. "다음 단계" enabled after exchange ----

  it('교환이 없을 때 "다음 단계" 버튼이 비활성화된다', async () => {
    setupMocks({ messages: [] })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '다음 단계' })).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: '다음 단계' })).toBeDisabled()
  })

  it('AI 응답 후 "다음 단계" 버튼이 활성화된다', async () => {
    setupMocks({ messages: mockMessages })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '다음 단계' })).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: '다음 단계' })).not.toBeDisabled()
  })

  // ---- 11. Step 5 → navigate to preview ----

  it('5단계에서 완료 버튼 클릭 시 미리보기로 이동한다', async () => {
    setupMocks({ messages: mockMessages })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )

    // Set to step 5
    act(() => {
      useGuideStore.setState({ currentStep: 5 })
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '완료 및 미리보기' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '완료 및 미리보기' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/guide/1/preview')
    })
  })

  // ---- 12. Claude unavailable ----

  it('Claude CLI를 사용할 수 없을 때 경고 메시지를 표시한다', async () => {
    setupMocks({ claudeAvailable: false })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
    expect(screen.getByText(/Claude CLI를 사용할 수 없습니다/i)).toBeInTheDocument()
  })

  // ---- Additional: breadcrumb ----

  it('브레드크럼에 홈 링크가 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )
    expect(screen.getByText('홈')).toBeInTheDocument()
  })

  it('브레드크럼에 작업 이름이 표시된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
    )
  })

  // ---- Additional: message send ----

  it('메시지 입력 후 전송 버튼 클릭 시 sendMessage가 호출된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )

    const input = screen.getByRole('textbox', { name: '메시지 입력' })
    fireEvent.change(input, { target: { value: '테스트 메시지' } })
    fireEvent.click(screen.getByRole('button', { name: '전송' }))

    await waitFor(() => {
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
        'claude:send-message',
        '테스트 메시지',
        expect.any(String)
      )
    })
  })

  it('Enter 키로 메시지를 전송한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeInTheDocument()
    )

    const input = screen.getByRole('textbox', { name: '메시지 입력' })
    fireEvent.change(input, { target: { value: 'Enter 테스트' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
        'claude:send-message',
        'Enter 테스트',
        expect.any(String)
      )
    })
  })

  // ---- Previous step ----

  it('"이전 단계" 버튼은 1단계에서 비활성화된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '이전 단계' })).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: '이전 단계' })).toBeDisabled()
  })

  it('"이전 단계" 버튼은 2단계 이상에서 활성화된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '이전 단계' })).toBeInTheDocument()
    )

    act(() => {
      useGuideStore.setState({ currentStep: 2 })
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '이전 단계' })).not.toBeDisabled()
    )
  })

  // ---- Error state ----

  it('초기화 실패 시 에러 메시지를 표시한다', async () => {
    vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
      if (channel === 'work:get-by-id') return Promise.reject(new Error('네트워크 오류'))
      return Promise.resolve(null)
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/네트워크 오류/)).toBeInTheDocument()
    )
  })
})

// ---------------------------------------------------------------------------
// StepIndicator component tests
// ---------------------------------------------------------------------------

import StepIndicator from '../components/guide/StepIndicator'

describe('StepIndicator', () => {
  it('5개의 단계 버튼을 렌더링한다', () => {
    render(<StepIndicator currentStep={1} />)
    expect(screen.getByRole('button', { name: /1단계: 유형\/목적/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2단계: 트리거/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3단계: 구조/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /4단계: 도구\/권한/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /5단계: 미리보기/ })).toBeInTheDocument()
  })

  it('현재 단계에 aria-current="step"을 설정한다', () => {
    render(<StepIndicator currentStep={3} />)
    const step3Btn = screen.getByRole('button', { name: /3단계: 구조/ })
    expect(step3Btn).toHaveAttribute('aria-current', 'step')
  })

  it('완료된 단계에 체크 표시를 렌더링한다', () => {
    render(<StepIndicator currentStep={3} />)
    // Steps 1 and 2 are completed
    const step1Btn = screen.getByRole('button', { name: /1단계: 유형\/목적/ })
    expect(step1Btn.textContent).toContain('✓')
  })
})

// ---------------------------------------------------------------------------
// ChatBubble component tests
// ---------------------------------------------------------------------------

import ChatBubble from '../components/guide/ChatBubble'

describe('ChatBubble', () => {
  const userMsg = { role: 'user' as const, content: '사용자 메시지', timestamp: '2024-01-01T00:00:00Z' }
  const aiMsg = { role: 'assistant' as const, content: 'AI 응답', timestamp: '2024-01-01T00:00:00Z' }
  const systemMsg = { role: 'system' as const, content: '시스템 메시지', timestamp: '2024-01-01T00:00:00Z' }

  it('사용자 메시지를 렌더링한다', () => {
    render(<ChatBubble message={userMsg} />)
    expect(screen.getByText('사용자 메시지')).toBeInTheDocument()
  })

  it('AI 메시지를 렌더링한다', () => {
    render(<ChatBubble message={aiMsg} />)
    expect(screen.getByText('AI 응답')).toBeInTheDocument()
  })

  it('시스템 메시지를 가운데 정렬된 스타일로 렌더링한다', () => {
    render(<ChatBubble message={systemMsg} />)
    expect(screen.getByText('시스템 메시지')).toBeInTheDocument()
  })

  it('사용자 메시지에는 AI 아바타가 없다', () => {
    render(<ChatBubble message={userMsg} />)
    expect(screen.queryByText('AI')).not.toBeInTheDocument()
  })

  it('AI 메시지에는 AI 아바타가 있다', () => {
    render(<ChatBubble message={aiMsg} />)
    expect(screen.getByText('AI')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// GuideChat component tests
// ---------------------------------------------------------------------------

import GuideChat from '../components/guide/GuideChat'

describe('GuideChat', () => {
  const msgs = [
    { role: 'user' as const, content: '첫 메시지', timestamp: '2024-01-01T00:00:00Z' },
    { role: 'assistant' as const, content: 'AI의 첫 응답', timestamp: '2024-01-01T00:00:01Z' },
  ]

  it('메시지 목록을 렌더링한다', () => {
    render(<GuideChat messages={msgs} isStreaming={false} />)
    expect(screen.getByText('첫 메시지')).toBeInTheDocument()
    expect(screen.getByText("AI의 첫 응답")).toBeInTheDocument()
  })

  it('메시지가 없을 때 안내 텍스트를 표시한다', () => {
    render(<GuideChat messages={[]} isStreaming={false} />)
    expect(screen.getByText('대화를 시작하세요.')).toBeInTheDocument()
  })

  it('스트리밍 중에 스트리밍 인디케이터를 표시한다', () => {
    render(<GuideChat messages={[]} isStreaming={true} />)
    expect(screen.getByLabelText('AI 응답 중')).toBeInTheDocument()
  })

  it('role="log"을 가진다', () => {
    render(<GuideChat messages={[]} isStreaming={false} />)
    expect(screen.getByRole('log')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// DesignStatePanel component tests
// ---------------------------------------------------------------------------

import DesignStatePanel from '../components/guide/DesignStatePanel'

describe('DesignStatePanel', () => {
  it('설계 현황 섹션을 렌더링한다', () => {
    render(<DesignStatePanel designState={{}} basePattern={null} currentStep={1} />)
    expect(screen.getByText('설계 현황')).toBeInTheDocument()
  })

  it('완료된 단계가 없을 때 안내 메시지를 표시한다', () => {
    render(<DesignStatePanel designState={{}} basePattern={null} currentStep={1} />)
    expect(screen.getByText('아직 완료된 단계가 없습니다.')).toBeInTheDocument()
  })

  it('완료된 단계 결과를 표시한다', () => {
    const designState = { step1: '스킬 유형을 선택했습니다.' }
    render(<DesignStatePanel designState={designState} basePattern={null} currentStep={2} />)
    expect(screen.getByText(/스킬 유형을 선택했습니다/)).toBeInTheDocument()
  })

  it('기반 패턴 정보를 표시한다', () => {
    render(
      <DesignStatePanel designState={{}} basePattern={mockPattern} currentStep={1} />
    )
    expect(screen.getByText('기반 패턴')).toBeInTheDocument()
    expect(screen.getByText('기본 스킬 패턴')).toBeInTheDocument()
  })

  it('기반 패턴이 없으면 패턴 섹션을 숨긴다', () => {
    render(<DesignStatePanel designState={{}} basePattern={null} currentStep={1} />)
    expect(screen.queryByText('기반 패턴')).not.toBeInTheDocument()
  })
})
