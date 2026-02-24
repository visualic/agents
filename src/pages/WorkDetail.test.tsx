// @TASK P4-S2-T1 - WorkDetail Page Unit Tests (TDD RED)
// @SPEC docs/planning/03-user-flow.md#work-detail

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
  }
})

import { ipc } from '../lib/ipc'
import WorkDetail from './WorkDetail'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockWork = {
  id: 1,
  name: '자동화 스킬',
  type: 'skill' as const,
  base_pattern_id: null,
  status: 'exported' as const,
  export_path: '/Users/test/.claude/skills/auto',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

const mockFiles = [
  { id: 1, work_id: 1, file_name: 'SKILL.md', file_path: 'SKILL.md', file_type: 'skill_md' as const },
  { id: 2, work_id: 1, file_name: 'config.json', file_path: 'config.json', file_type: 'config' as const },
]

const SKILL_CONTENT = '# 자동화 스킬\n\n## 설명\n이것은 자동화 스킬입니다.'
const CONFIG_CONTENT = '{ "version": "1.0" }'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks({
  work = mockWork,
  files = mockFiles,
  fileContentMap = {
    'SKILL.md': SKILL_CONTENT,
    'config.json': CONFIG_CONTENT,
  } as Record<string, string>,
  claudeDir = '/Users/test/.claude',
  exportSuccess = true,
  deleteSuccess = true,
}: {
  work?: typeof mockWork | null
  files?: typeof mockFiles
  fileContentMap?: Record<string, string>
  claudeDir?: string | null
  exportSuccess?: boolean
  deleteSuccess?: boolean
} = {}) {
  vi.mocked(ipc.invoke).mockImplementation((channel: string, ...args: unknown[]) => {
    if (channel === 'work:get-by-id') return Promise.resolve(work)
    if (channel === 'work-file:get-by-work-id') return Promise.resolve(files)
    if (channel === 'work-file:read-content') {
      const filePath = args[0] as string
      const content = fileContentMap[filePath] ?? ''
      return Promise.resolve({ success: true, content })
    }
    if (channel === 'file:detect-claude-dir') return Promise.resolve(claudeDir)
    if (channel === 'file:browse-directory')
      return Promise.resolve({ canceled: false, filePaths: ['/new/path'] })
    if (channel === 'file:export')
      return Promise.resolve({ success: exportSuccess, error: exportSuccess ? undefined : '내보내기 실패' })
    if (channel === 'work:update')
      return Promise.resolve({ ...work, status: 'exported', export_path: args[1] as string })
    if (channel === 'work:delete')
      return deleteSuccess ? Promise.resolve() : Promise.reject(new Error('삭제 실패'))
    return Promise.resolve(null)
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkDetail />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  // ---- 2. Work not found ----

  it('작업을 찾지 못했을 때 에러 메시지를 표시한다', async () => {
    setupMocks({ work: null })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/찾을 수 없습니다/i)).toBeInTheDocument()
    )
  })

  // ---- 3. Normal render: WorkHeader ----

  it('작업 이름, TypeBadge, StatusBadge, 날짜를 렌더링한다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getAllByText('자동화 스킬').length).toBeGreaterThanOrEqual(1)
    )

    // TypeBadge
    expect(screen.getByText('스킬')).toBeInTheDocument()
    // StatusBadge
    expect(screen.getByText('내보냄')).toBeInTheDocument()
    // Dates appear somewhere in the document
    expect(screen.getByText(/2024-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument()
  })

  // ---- 4. File tree: renders file list, first file auto-selected ----

  it('파일 목록을 렌더링하고 첫 번째 파일이 자동 선택된다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
    )
    expect(screen.getAllByText('config.json').length).toBeGreaterThanOrEqual(1)

    // First file button should be aria-current
    const firstFileButton = screen.getByRole('button', { name: /SKILL\.md/ })
    expect(firstFileButton).toHaveAttribute('aria-current', 'true')
  })

  // ---- 5. Editor: shows file content ----

  it('첫 번째 파일의 내용을 에디터에 표시한다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByDisplayValue(/자동화 스킬/)).toBeInTheDocument()
    )
  })

  // ---- 6. File switching ----

  it('다른 파일을 클릭하면 해당 파일의 내용을 로드한다', async () => {
    setupMocks()
    renderPage()

    // Wait for first file to be loaded
    await waitFor(() =>
      expect(screen.getByDisplayValue(/자동화 스킬/)).toBeInTheDocument()
    )

    // Click second file
    fireEvent.click(screen.getByRole('button', { name: /config\.json/ }))

    // Second file content should appear
    await waitFor(() =>
      expect(screen.getByDisplayValue(/version/)).toBeInTheDocument()
    )
  })

  // ---- 7. File editing: dirty state ----

  it('에디터 내용을 변경하면 더티 상태가 된다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByDisplayValue(/자동화 스킬/)).toBeInTheDocument()
    )

    const editor = screen.getByRole('textbox', { name: '파일 내용 편집기' })
    fireEvent.change(editor, { target: { value: '# 수정된 내용' } })

    await waitFor(() =>
      expect(screen.getByText('수정됨')).toBeInTheDocument()
    )
  })

  // ---- 8. Re-export button ----

  it('재내보내기 버튼이 존재하고 클릭 가능하다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '재내보내기' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '재내보내기' }))

    // file:export should be called
    await waitFor(() =>
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
        'file:export',
        expect.any(String),
        expect.any(String)
      )
    )
  })

  // ---- 9. Delete button: shows delete modal ----

  it('삭제 버튼 클릭 시 삭제 확인 모달이 나타난다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    // Modal should appear
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: '삭제 확인' })).toBeInTheDocument()
    )
    expect(screen.getByText(/정말 삭제하시겠습니까/)).toBeInTheDocument()
    // Work name shown in modal
    expect(screen.getAllByText('자동화 스킬').length).toBeGreaterThanOrEqual(1)
  })

  // ---- 10. Delete confirm: IPC delete + navigate ----

  it('모달에서 삭제 확인 시 work:delete IPC를 호출하고 /workspace로 이동한다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
    )

    // Open delete modal
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: '삭제 확인' })).toBeInTheDocument()
    )

    // Click confirm button inside modal
    const confirmButton = screen.getByRole('button', { name: /^삭제$/ })
    // There may be two "삭제" buttons — find the one in the modal
    const modal = screen.getByRole('dialog', { name: '삭제 확인' })
    const deleteInModal = modal.querySelector('button[aria-label="삭제 확인"]') as HTMLElement ??
      screen.getAllByText('삭제').find(el => el.closest('[role="dialog"]'))?.closest('button') as HTMLElement

    // Use the confirm delete button directly
    const allButtons = screen.getAllByRole('button')
    const confirmBtn = allButtons.find(
      (btn) => btn.textContent === '삭제' && btn.closest('[role="dialog"]') !== null
    )
    if (confirmBtn) fireEvent.click(confirmBtn)
    else fireEvent.click(confirmButton)

    await waitFor(() =>
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:delete', 1)
    )
    expect(mockNavigate).toHaveBeenCalledWith('/workspace')
  })

  // ---- Modal: cancel button closes modal ----

  it('모달에서 취소 버튼 클릭 시 모달이 닫힌다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: '삭제 확인' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '삭제 확인' })).not.toBeInTheDocument()
    )
  })

  // ---- Breadcrumb ----

  it('홈 > 내 작업실 > {work.name} 브레드크럼을 표시한다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('홈')).toBeInTheDocument()
    )
    expect(screen.getByText('내 작업실')).toBeInTheDocument()
  })

  // ---- 가이드 재시작 button ----

  it('"가이드 재시작" 버튼 클릭 시 /guide/:id로 이동한다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '가이드 재시작' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '가이드 재시작' }))
    expect(mockNavigate).toHaveBeenCalledWith('/guide/1')
  })

  // ---- Re-export success toast ----

  it('재내보내기 성공 시 성공 토스트를 표시한다', async () => {
    setupMocks()
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '재내보내기' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '재내보내기' }))

    await waitFor(() =>
      expect(screen.getByText(/내보내기 완료/i)).toBeInTheDocument()
    )
  })

  // ---- Re-export failure toast ----

  it('재내보내기 실패 시 에러 토스트를 표시한다', async () => {
    setupMocks({ exportSuccess: false })
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '재내보내기' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '재내보내기' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
  })
})
