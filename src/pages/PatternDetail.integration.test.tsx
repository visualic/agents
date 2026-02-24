// @TASK P2-S3-T2 - Pattern Detail Integration Tests
// @SPEC docs/planning/03-user-flow.md#pattern-detail

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock IPC before any imports that use it
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: { invoke: vi.fn() },
}))

import { ipc } from '../lib/ipc'
import PatternDetail from './PatternDetail'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockPattern = {
  id: 1,
  name: '코드 리뷰 스킬',
  type: 'skill' as const,
  description: '코드를 자동으로 리뷰합니다.',
  source: 'internal' as const,
  source_url: null,
  structure_preview: '{ "steps": ["lint", "review", "report"] }',
  file_path: '/skills/code-review.md',
  tag_names: 'react,typescript',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockRelatedPatterns = [
  {
    id: 2,
    name: '테스트 자동화 스킬',
    type: 'skill' as const,
    description: '테스트를 자동으로 실행합니다.',
    source: 'internal' as const,
    source_url: null,
    structure_preview: null,
    file_path: '/skills/test-automation.md',
    tag_names: 'testing',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    name: '문서 생성 스킬',
    type: 'skill' as const,
    description: '문서를 자동 생성합니다.',
    source: 'internal' as const,
    source_url: null,
    structure_preview: null,
    file_path: '/skills/doc-gen.md',
    tag_names: 'docs',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

const mockFileContent = '# 코드 리뷰 스킬\n\n이 스킬은 코드를 자동으로 리뷰합니다.\n\n## 단계\n1. lint\n2. review\n3. report'
const mockWork = { id: 42 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaultMocks({
  pattern = mockPattern,
  relatedPatterns = mockRelatedPatterns,
  fileContent = mockFileContent,
  work = mockWork,
  exportResult = { success: true },
}: {
  pattern?: typeof mockPattern | null
  relatedPatterns?: typeof mockRelatedPatterns
  fileContent?: string
  work?: typeof mockWork
  exportResult?: { success: boolean; error?: string }
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
    if (channel === 'pattern:get-by-id') return Promise.resolve(pattern)
    if (channel === 'pattern:get-related') return Promise.resolve(relatedPatterns)
    if (channel === 'file:read') return Promise.resolve(fileContent)
    if (channel === 'work:create') return Promise.resolve(work)
    if (channel === 'file:export') return Promise.resolve(exportResult)
    return Promise.resolve(null)
  })
}

// Spy component to capture navigation targets
function GuideSpy() {
  return <div data-testid="guide-page">가이드 페이지</div>
}

function renderApp(patternId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/patterns/${patternId}`]}>
      <Routes>
        <Route path="/patterns/:id" element={<PatternDetail />} />
        <Route path="/guide/:workId" element={<GuideSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe('PatternDetail Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================================================
  // 시나리오 1: 초기 로드
  // ========================================================================

  describe('시나리오 1: 초기 로드', () => {
    it('페이지 접속 시 정보 헤더가 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1)
      })
      expect(screen.getByText('코드를 자동으로 리뷰합니다.')).toBeInTheDocument()
    })

    it('브레드크럼이 올바르게 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() =>
        expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1)
      )
      expect(screen.getByText('홈')).toBeInTheDocument()
      expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
    })

    it('구조 미리보기가 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => expect(screen.getByText('구조 미리보기')).toBeInTheDocument())
      expect(screen.getByText(/lint.*review.*report/s)).toBeInTheDocument()
    })

    it('코드 섹션이 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => expect(screen.getByText('파일 내용')).toBeInTheDocument())
    })

    it('액션 버튼 4개가 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '포크' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '조합' })).toBeInTheDocument()
      })
    })

    it('"포크"와 "조합" 버튼은 비활성화 상태이다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '포크' })).toBeDisabled()
        expect(screen.getByRole('button', { name: '조합' })).toBeDisabled()
      })
    })

    it('관련 패턴 목록이 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('테스트 자동화 스킬')).toBeInTheDocument()
        expect(screen.getByText('문서 생성 스킬')).toBeInTheDocument()
      })
    })

    it('태그가 표시된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() => {
        expect(screen.getByText('react')).toBeInTheDocument()
        expect(screen.getByText('typescript')).toBeInTheDocument()
      })
    })

    it('IPC pattern:get-by-id가 올바른 id로 호출된다', async () => {
      setupDefaultMocks()
      renderApp('1')
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('pattern:get-by-id', 1)
      })
    })

    it('IPC pattern:get-related가 호출된다', async () => {
      setupDefaultMocks()
      renderApp('1')
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('pattern:get-related', 1)
      })
    })
  })

  // ========================================================================
  // 시나리오 2: 가이드 대화 시작
  // ========================================================================

  describe('시나리오 2: 가이드 대화 시작', () => {
    it('"가이드 대화" 클릭 시 work:create가 올바른 인자로 호출된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '가이드 대화' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:create', {
          name: '코드 리뷰 스킬',
          type: 'skill',
          base_pattern_id: 1,
        })
      })
    })

    it('"가이드 대화" 클릭 후 /guide/:workId로 이동한다', async () => {
      setupDefaultMocks({ work: { id: 42 } })
      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '가이드 대화' }))

      await waitFor(() => {
        expect(screen.getByTestId('guide-page')).toBeInTheDocument()
      })
    })

    it('work:create 실패 시 에러 Toast를 표시한다', async () => {
      vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
        if (channel === 'pattern:get-by-id') return Promise.resolve(mockPattern)
        if (channel === 'pattern:get-related') return Promise.resolve([])
        if (channel === 'file:read') return Promise.resolve('')
        if (channel === 'work:create') return Promise.reject(new Error('작업 생성 실패'))
        return Promise.resolve(null)
      })

      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '가이드 대화' }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/작업 생성 실패/)).toBeInTheDocument()
      })
    })
  })

  // ========================================================================
  // 시나리오 3: 바로 내보내기
  // ========================================================================

  describe('시나리오 3: 바로 내보내기', () => {
    it('"바로 내보내기" 클릭 시 file:export가 호출된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '바로 내보내기' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'file:export',
          expect.any(String),
          expect.any(String)
        )
      })
    })

    it('"바로 내보내기" 성공 시 성공 Toast가 표시된다', async () => {
      setupDefaultMocks({ exportResult: { success: true } })
      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '바로 내보내기' }))

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert.className).toContain('bg-green')
      })
    })

    it('"바로 내보내기" 실패 시 에러 Toast가 표시된다', async () => {
      setupDefaultMocks({ exportResult: { success: false, error: '저장 경로 없음' } })
      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '바로 내보내기' }))

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(screen.getByText('저장 경로 없음')).toBeInTheDocument()
      })
    })

    it('file:export 호출 시 올바른 파일 경로가 전달된다', async () => {
      setupDefaultMocks()
      renderApp()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '바로 내보내기' }))

      await waitFor(() => {
        const exportCall = vi.mocked(ipc.invoke).mock.calls.find(
          (c) => c[0] === 'file:export'
        )
        expect(exportCall).toBeDefined()
        expect(exportCall?.[1]).toBe('/skills/code-review.md')
      })
    })
  })

  // ========================================================================
  // 에러 처리
  // ========================================================================

  describe('에러 처리', () => {
    it('pattern:get-by-id 실패 시 에러 메시지를 표시한다', async () => {
      vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
        if (channel === 'pattern:get-by-id')
          return Promise.reject(new Error('DB 연결 오류'))
        return Promise.resolve([])
      })

      renderApp()

      await waitFor(() => {
        expect(screen.getByText(/DB 연결 오류/)).toBeInTheDocument()
      })
    })

    it('패턴이 null이면 "패턴을 찾을 수 없습니다" 메시지를 표시한다', async () => {
      setupDefaultMocks({ pattern: null })
      renderApp()

      await waitFor(() => {
        expect(screen.getByText(/패턴을 찾을 수 없습니다/i)).toBeInTheDocument()
      })
    })
  })

  // ========================================================================
  // 관련 패턴
  // ========================================================================

  describe('관련 패턴 섹션', () => {
    it('관련 패턴이 없으면 "관련 패턴 없음" 메시지를 표시한다', async () => {
      setupDefaultMocks({ relatedPatterns: [] })
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('관련 패턴 없음')).toBeInTheDocument()
      })
    })

    it('관련 패턴이 3개 초과이면 최대 3개만 표시한다', async () => {
      const manyRelated = [
        ...mockRelatedPatterns,
        {
          id: 4,
          name: '세 번째 패턴',
          type: 'skill' as const,
          description: null,
          source: 'internal' as const,
          source_url: null,
          structure_preview: null,
          file_path: '/skills/third.md',
          tag_names: '',
          created_at: '2024-01-04T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
        },
        {
          id: 5,
          name: '네 번째 패턴',
          type: 'skill' as const,
          description: null,
          source: 'internal' as const,
          source_url: null,
          structure_preview: null,
          file_path: '/skills/fourth.md',
          tag_names: '',
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z',
        },
      ]
      setupDefaultMocks({ relatedPatterns: manyRelated })
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('테스트 자동화 스킬')).toBeInTheDocument()
        expect(screen.getByText('문서 생성 스킬')).toBeInTheDocument()
        expect(screen.getByText('세 번째 패턴')).toBeInTheDocument()
      })
      // Fourth pattern should not be visible (max 3)
      expect(screen.queryByText('네 번째 패턴')).not.toBeInTheDocument()
    })
  })
})
