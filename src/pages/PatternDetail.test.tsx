// @TASK P2-S3-T1 - Pattern Detail Unit Tests
// @SPEC docs/planning/03-user-flow.md#pattern-detail

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock IPC and react-router-dom before imports
// ---------------------------------------------------------------------------

vi.mock('../lib/ipc', () => ({
  ipc: { invoke: vi.fn() },
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
  }
})

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
]

const mockFileContent = '# 코드 리뷰 스킬\n\n이 스킬은 코드를 자동으로 리뷰합니다.'
const mockWork = { id: 99 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks({
  pattern = mockPattern,
  relatedPatterns = mockRelatedPatterns,
  fileContent = mockFileContent,
  workResult = mockWork,
  exportResult = { success: true },
}: {
  pattern?: typeof mockPattern | null
  relatedPatterns?: typeof mockRelatedPatterns
  fileContent?: string
  workResult?: typeof mockWork
  exportResult?: { success: boolean; error?: string }
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
    if (channel === 'pattern:get-by-id') return Promise.resolve(pattern)
    if (channel === 'pattern:get-related') return Promise.resolve(relatedPatterns)
    if (channel === 'file:read') return Promise.resolve(fileContent)
    if (channel === 'work:create') return Promise.resolve(workResult)
    if (channel === 'file:export') return Promise.resolve(exportResult)
    return Promise.resolve(null)
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PatternDetail />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PatternDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- 로딩 상태 ----

  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    // Never resolves: keeps component in loading state
    vi.mocked(ipc.invoke).mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()
  })

  // ---- 브레드크럼 ----

  it('브레드크럼에 홈 링크가 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('홈')).toBeInTheDocument()
  })

  it('브레드크럼에 패턴 라이브러리 링크가 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
  })

  it('브레드크럼에 패턴 이름이 표시된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      // pattern name appears in both breadcrumb and header
      expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ---- 패턴 헤더 ----

  it('패턴 이름을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('TypeBadge를 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getAllByText('스킬').length).toBeGreaterThanOrEqual(1))
  })

  it('패턴 설명을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getByText('코드를 자동으로 리뷰합니다.')).toBeInTheDocument())
  })

  it('태그를 칩으로 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument()
      expect(screen.getByText('typescript')).toBeInTheDocument()
    })
  })

  it('내부 소스 패턴은 "내부" 표시를 한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getByText(/내부/i)).toBeInTheDocument())
  })

  it('외부 소스 패턴은 source_url 링크를 표시한다', async () => {
    setupMocks({
      pattern: {
        ...mockPattern,
        source: 'external',
        source_url: 'https://example.com/skill',
      },
    })
    renderPage()
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /example\.com/ })
      expect(link).toHaveAttribute('href', 'https://example.com/skill')
    })
  })

  // ---- 구조 미리보기 ----

  it('구조 미리보기 섹션을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getByText('구조 미리보기')).toBeInTheDocument())
  })

  it('structure_preview 내용을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/lint.*review.*report/s)).toBeInTheDocument()
    )
  })

  it('structure_preview가 null이면 구조 미리보기 섹션을 숨긴다', async () => {
    setupMocks({ pattern: { ...mockPattern, structure_preview: null } })
    renderPage()
    await waitFor(() => expect(screen.getAllByText('코드 리뷰 스킬').length).toBeGreaterThanOrEqual(1))
    expect(screen.queryByText('구조 미리보기')).not.toBeInTheDocument()
  })

  // ---- 코드 뷰어 ----

  it('코드 뷰어 섹션을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getByText('파일 내용')).toBeInTheDocument())
  })

  // ---- 액션 버튼 ----

  it('"가이드 대화" 버튼이 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
    )
  })

  it('"바로 내보내기" 버튼이 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
    )
  })

  it('"포크" 버튼이 있고 비활성화되어 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      const forkBtn = screen.getByRole('button', { name: '포크' })
      expect(forkBtn).toBeInTheDocument()
      expect(forkBtn).toBeDisabled()
    })
  })

  it('"조합" 버튼이 있고 비활성화되어 있다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      const combineBtn = screen.getByRole('button', { name: '조합' })
      expect(combineBtn).toBeInTheDocument()
      expect(combineBtn).toBeDisabled()
    })
  })

  // ---- 가이드 대화 ----

  it('"가이드 대화" 클릭 시 work:create를 호출한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '가이드 대화' }))
    await waitFor(() => {
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:create', {
        name: mockPattern.name,
        type: mockPattern.type,
        base_pattern_id: mockPattern.id,
      })
    })
  })

  it('"가이드 대화" 클릭 후 /guide/:workId로 이동한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '가이드 대화' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '가이드 대화' }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/guide/99')
    })
  })

  // ---- 바로 내보내기 ----

  it('"바로 내보내기" 클릭 시 file:export를 호출한다', async () => {
    setupMocks()
    renderPage()
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

  it('"바로 내보내기" 성공 시 성공 Toast를 표시한다', async () => {
    setupMocks({ exportResult: { success: true } })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '바로 내보내기' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('"바로 내보내기" 실패 시 에러 Toast를 표시한다', async () => {
    setupMocks({ exportResult: { success: false, error: '내보내기 실패' } })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '바로 내보내기' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '바로 내보내기' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/내보내기 실패/)).toBeInTheDocument()
    })
  })

  // ---- 관련 패턴 ----

  it('관련 패턴 섹션을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => expect(screen.getByText('관련 패턴')).toBeInTheDocument())
  })

  it('관련 패턴 목록을 렌더링한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('테스트 자동화 스킬')).toBeInTheDocument()
    )
  })

  it('관련 패턴이 없으면 빈 메시지를 표시한다', async () => {
    setupMocks({ relatedPatterns: [] })
    renderPage()
    await waitFor(() => expect(screen.getByText('관련 패턴 없음')).toBeInTheDocument())
  })

  // ---- 에러 처리 ----

  it('패턴 로드 실패 시 에러 메시지를 표시한다', async () => {
    vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
      if (channel === 'pattern:get-by-id') return Promise.reject(new Error('패턴을 찾을 수 없습니다'))
      return Promise.resolve([])
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/패턴을 찾을 수 없습니다/)).toBeInTheDocument()
    )
  })

  it('패턴이 null이면 "패턴 없음" 메시지를 표시한다', async () => {
    setupMocks({ pattern: null })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/패턴을 찾을 수 없습니다/i)).toBeInTheDocument()
    )
  })

  // ---- IPC 호출 ----

  it('마운트 시 pattern:get-by-id를 호출한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('pattern:get-by-id', 1)
    })
  })

  it('마운트 시 pattern:get-related를 호출한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() => {
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('pattern:get-related', 1)
    })
  })
})

// ---------------------------------------------------------------------------
// StructurePreview component tests
// ---------------------------------------------------------------------------

import StructurePreview from '../components/patterns/StructurePreview'

describe('StructurePreview', () => {
  it('구조 내용을 렌더링한다', () => {
    render(<StructurePreview content='{ "steps": ["lint"] }' />)
    expect(screen.getByText(/lint/)).toBeInTheDocument()
  })

  it('"구조 미리보기" 레이블을 표시한다', () => {
    render(<StructurePreview content="test" />)
    expect(screen.getByText('구조 미리보기')).toBeInTheDocument()
  })

  it('pre 태그로 monospace 렌더링한다', () => {
    render(<StructurePreview content="step1\nstep2" />)
    const pre = screen.getByText(/step1/)
    expect(pre.tagName.toLowerCase()).toBe('pre')
  })
})

// ---------------------------------------------------------------------------
// CodeViewer component tests
// ---------------------------------------------------------------------------

import CodeViewer from '../components/editor/CodeViewer'

describe('CodeViewer', () => {
  it('파일 내용을 줄 번호와 함께 렌더링한다', () => {
    const multiLineContent = ['line one', 'line two'].join('\n')
    render(<CodeViewer content={multiLineContent} />)
    expect(screen.getByText('line one')).toBeInTheDocument()
    expect(screen.getByText('line two')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('filePath를 표시한다', () => {
    render(<CodeViewer content="content" filePath="/skills/example.md" />)
    expect(screen.getByText('/skills/example.md')).toBeInTheDocument()
  })

  it('filePath 없이도 렌더링된다', () => {
    render(<CodeViewer content="content" />)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
