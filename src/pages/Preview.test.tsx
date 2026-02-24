// @TASK P3-S2-T1 - Preview Page Unit Tests (TDD RED)
// @SPEC docs/planning/03-user-flow.md#preview

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
import Preview from './Preview'
import { usePreviewStore } from '../stores/previewStore'

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

const mockFiles = [
  {
    id: 1,
    work_id: 1,
    file_name: 'SKILL.md',
    file_path: 'SKILL.md',
    file_type: 'skill_md' as const,
  },
  {
    id: 2,
    work_id: 1,
    file_name: 'references/helper.md',
    file_path: 'references/helper.md',
    file_type: 'reference' as const,
  },
  {
    id: 3,
    work_id: 1,
    file_name: 'config.json',
    file_path: 'config.json',
    file_type: 'config' as const,
  },
]

const SKILL_MD_CONTENT = '# My Skill\n\n## Description\nThis is a skill.'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks({
  work = mockWork,
  files = mockFiles,
  fileContent = SKILL_MD_CONTENT,
  claudeDir = '/Users/test/.claude',
  exportSuccess = true,
}: {
  work?: typeof mockWork | null
  files?: typeof mockFiles
  fileContent?: string
  claudeDir?: string | null
  exportSuccess?: boolean
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
    if (channel === 'work:get-by-id') return Promise.resolve(work)
    if (channel === 'work-file:get-by-work-id') return Promise.resolve(files)
    if (channel === 'work-file:read-content')
      return Promise.resolve({ success: true, content: fileContent })
    if (channel === 'file:detect-claude-dir') return Promise.resolve(claudeDir)
    if (channel === 'file:browse-directory')
      return Promise.resolve({ canceled: false, filePaths: ['/new/path'] })
    if (channel === 'file:export')
      return Promise.resolve({ success: exportSuccess, error: exportSuccess ? undefined : '내보내기 실패' })
    if (channel === 'work:update') return Promise.resolve({ ...work, status: 'exported', export_path: args[1] as string })
    return Promise.resolve(null)
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Preview />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePreviewStore.setState({
      work: null,
      files: [],
      selectedFileId: null,
      fileContents: {},
      editedContents: {},
      exportPath: '',
      claudeDir: null,
      loading: false,
      exporting: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- 1. Loading state ----

  it('데이터를 불러오는 동안 로딩 상태를 표시한다', () => {
    vi.mocked(ipc.invoke).mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()
  })

  // ---- 2. File tree ----

  it('파일 목록이 있는 파일 트리를 렌더링한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
    )
    expect(screen.getAllByText('references/helper.md').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('config.json').length).toBeGreaterThanOrEqual(1)
  })

  // ---- 3. Editor content ----

  it('선택된 파일의 내용을 마크다운 에디터에 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByDisplayValue(/My Skill/)).toBeInTheDocument()
    )
  })

  // ---- 4. Selected file highlight ----

  it('선택된 파일이 파일 트리에서 강조 표시된다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
    )
    // First file should be selected by default
    const firstFileButton = screen.getByRole('button', { name: /SKILL\.md/ })
    expect(firstFileButton).toHaveAttribute('aria-current', 'true')
  })

  // ---- 5. Dirty badge ----

  it('내용이 편집되었을 때 "수정됨" 배지를 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByDisplayValue(/My Skill/)).toBeInTheDocument()
    )

    const editor = screen.getByRole('textbox', { name: '파일 내용 편집기' })
    fireEvent.change(editor, { target: { value: '# 수정된 내용' } })

    await waitFor(() =>
      expect(screen.getByText('수정됨')).toBeInTheDocument()
    )
  })

  // ---- 6. Export path input ----

  it('기본 내보내기 경로가 있는 경로 입력창을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '내보내기 경로' })).toBeInTheDocument()
    )
    // skill type → ~/.claude/skills/{work.name}/
    const pathInput = screen.getByRole('textbox', { name: '내보내기 경로' })
    expect(pathInput).toHaveValue('/Users/test/.claude/skills/코드 리뷰 스킬')
  })

  // ---- 7. Export button disabled during export ----

  it('내보내기 중에 내보내기 버튼이 비활성화된다', async () => {
    // Keep exporting in a pending state
    let resolveExport: (val: unknown) => void
    vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
      if (channel === 'work:get-by-id') return Promise.resolve(mockWork)
      if (channel === 'work-file:get-by-work-id') return Promise.resolve(mockFiles)
      if (channel === 'work-file:read-content')
        return Promise.resolve({ success: true, content: SKILL_MD_CONTENT })
      if (channel === 'file:detect-claude-dir') return Promise.resolve('/Users/test/.claude')
      if (channel === 'file:export')
        return new Promise((resolve) => { resolveExport = resolve })
      return Promise.resolve(null)
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
    )

    // Click export - button text changes to "내보내는 중..."
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '내보내는 중...' })).toBeDisabled()
    )
  })

  // ---- 8. Breadcrumb ----

  it('작업 이름이 포함된 브레드크럼을 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('코드 리뷰 스킬')).toBeInTheDocument()
    )
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('미리보기')).toBeInTheDocument()
  })

  // ---- 9. Empty files list ----

  it('파일 목록이 비어있을 때 안내 메시지를 표시한다', async () => {
    setupMocks({ files: [] })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/파일이 없습니다/i)).toBeInTheDocument()
    )
  })

  // ---- 10. File read error ----

  it('파일 읽기 실패 시 에러를 처리한다', async () => {
    vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
      if (channel === 'work:get-by-id') return Promise.resolve(mockWork)
      if (channel === 'work-file:get-by-work-id') return Promise.resolve(mockFiles)
      if (channel === 'work-file:read-content')
        return Promise.resolve({ success: false, error: '파일을 읽을 수 없습니다' })
      if (channel === 'file:detect-claude-dir') return Promise.resolve('/Users/test/.claude')
      return Promise.resolve(null)
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
    )
    // Editor should show empty or error state — no crash
    const editor = screen.getByRole('textbox', { name: '파일 내용 편집기' })
    expect(editor).toBeInTheDocument()
  })

  // ---- 11. "수정하기" button navigates to guide ----

  it('"수정하기" 버튼 클릭 시 가이드 페이지로 이동한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '수정하기' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '수정하기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/guide/1')
  })

  // ---- 12. Export success ----

  it('내보내기 성공 시 성공 메시지를 표시한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

    await waitFor(() =>
      expect(screen.getByText(/내보내기 완료/i)).toBeInTheDocument()
    )
  })

  // ---- Additional: export path for agent type ----

  it('agent 유형의 경우 ~/.claude/agents/ 경로를 기본값으로 설정한다', async () => {
    const agentWork = { ...mockWork, type: 'agent' as const, name: '테스트 에이전트' }
    vi.mocked(ipc.invoke).mockImplementation((channel: string) => {
      if (channel === 'work:get-by-id') return Promise.resolve(agentWork)
      if (channel === 'work-file:get-by-work-id') return Promise.resolve([])
      if (channel === 'file:detect-claude-dir') return Promise.resolve('/Users/test/.claude')
      return Promise.resolve(null)
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '내보내기 경로' })).toBeInTheDocument()
    )
    const pathInput = screen.getByRole('textbox', { name: '내보내기 경로' })
    expect(pathInput).toHaveValue('/Users/test/.claude/agents/테스트 에이전트')
  })

  // ---- Additional: browse directory ----

  it('"찾아보기" 버튼 클릭 시 디렉토리 선택 다이얼로그를 열고 경로를 업데이트한다', async () => {
    setupMocks()
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '찾아보기' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '찾아보기' }))
    await waitFor(() => {
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('file:browse-directory')
    })
  })
})

// ---------------------------------------------------------------------------
// FileTree component tests
// ---------------------------------------------------------------------------

import FileTree from '../components/editor/FileTree'

describe('FileTree', () => {
  const files = [
    { id: 1, work_id: 1, file_name: 'SKILL.md', file_path: 'SKILL.md', file_type: 'skill_md' as const },
    { id: 2, work_id: 1, file_name: 'reference.md', file_path: 'refs/reference.md', file_type: 'reference' as const },
    { id: 3, work_id: 1, file_name: 'config.json', file_path: 'config.json', file_type: 'config' as const },
  ]

  it('파일 목록을 렌더링한다', () => {
    render(<FileTree files={files} selectedFileId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('SKILL.md')).toBeInTheDocument()
    expect(screen.getByText('reference.md')).toBeInTheDocument()
    expect(screen.getByText('config.json')).toBeInTheDocument()
  })

  it('선택된 파일에 aria-current="true"를 설정한다', () => {
    render(<FileTree files={files} selectedFileId={1} onSelect={vi.fn()} />)
    const skillBtn = screen.getByRole('button', { name: /SKILL\.md/ })
    expect(skillBtn).toHaveAttribute('aria-current', 'true')
  })

  it('파일 클릭 시 onSelect 콜백을 호출한다', () => {
    const onSelect = vi.fn()
    render(<FileTree files={files} selectedFileId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /SKILL\.md/ }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('파일이 없을 때 안내 메시지를 표시한다', () => {
    render(<FileTree files={[]} selectedFileId={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/파일이 없습니다/i)).toBeInTheDocument()
  })

  it('skill_md 파일에 문서 아이콘을 표시한다', () => {
    render(<FileTree files={files} selectedFileId={null} onSelect={vi.fn()} />)
    const skillBtn = screen.getByRole('button', { name: /SKILL\.md/ })
    expect(skillBtn.textContent).toContain('📄')
  })

  it('config 파일에 설정 아이콘을 표시한다', () => {
    render(<FileTree files={files} selectedFileId={null} onSelect={vi.fn()} />)
    const configBtn = screen.getByRole('button', { name: /config\.json/ })
    expect(configBtn.textContent).toContain('⚙️')
  })
})

// ---------------------------------------------------------------------------
// MarkdownEditor component tests
// ---------------------------------------------------------------------------

import MarkdownEditor from '../components/editor/MarkdownEditor'

describe('MarkdownEditor', () => {
  it('파일 내용을 textarea에 렌더링한다', () => {
    render(
      <MarkdownEditor
        fileId={1}
        content="# Hello World"
        originalContent="# Hello World"
        onChange={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('# Hello World')).toBeInTheDocument()
  })

  it('내용 변경 시 onChange를 호출한다', () => {
    const onChange = vi.fn()
    render(
      <MarkdownEditor
        fileId={1}
        content="# Hello"
        originalContent="# Hello"
        onChange={onChange}
      />
    )
    const textarea = screen.getByRole('textbox', { name: '파일 내용 편집기' })
    fireEvent.change(textarea, { target: { value: '# 수정됨' } })
    expect(onChange).toHaveBeenCalledWith(1, '# 수정됨')
  })

  it('원본과 다를 때 "수정됨" 배지를 표시한다', () => {
    render(
      <MarkdownEditor
        fileId={1}
        content="# 수정된 내용"
        originalContent="# 원본 내용"
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('수정됨')).toBeInTheDocument()
  })

  it('원본과 같을 때 "수정됨" 배지를 표시하지 않는다', () => {
    render(
      <MarkdownEditor
        fileId={1}
        content="# 동일한 내용"
        originalContent="# 동일한 내용"
        onChange={vi.fn()}
      />
    )
    expect(screen.queryByText('수정됨')).not.toBeInTheDocument()
  })

  it('fileId가 null일 때 비활성화된다', () => {
    render(
      <MarkdownEditor
        fileId={null}
        content=""
        originalContent=""
        onChange={vi.fn()}
      />
    )
    const textarea = screen.getByRole('textbox', { name: '파일 내용 편집기' })
    expect(textarea).toBeDisabled()
  })

  it('파일 선택 안내 텍스트를 표시한다 (fileId null일 때)', () => {
    render(
      <MarkdownEditor
        fileId={null}
        content=""
        originalContent=""
        onChange={vi.fn()}
      />
    )
    const textarea = screen.getByRole('textbox', { name: '파일 내용 편집기' })
    expect(textarea.getAttribute('placeholder')).toContain('파일을 선택하세요')
  })
})
