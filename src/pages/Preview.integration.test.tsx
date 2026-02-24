// @TASK P3-S2-T2 - Preview Page Integration Tests (TDD RED)
// @SPEC docs/planning/03-user-flow.md#preview

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
import Preview from './Preview'
import { usePreviewStore } from '../stores/previewStore'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockWork = {
  id: 1,
  name: '자동화 스킬',
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
    file_name: 'config.json',
    file_path: 'config.json',
    file_type: 'config' as const,
  },
]

const SKILL_CONTENT = '# 자동화 스킬\n\n## 설명\n이것은 자동화 스킬입니다.'
const CONFIG_CONTENT = '{ "version": "1.0" }'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function WorkspaceSpy() {
  return <div data-testid="workspace-page">워크스페이스 페이지</div>
}

function GuideSpy() {
  return <div data-testid="guide-page">가이드 페이지</div>
}

function renderApp(workId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/guide/${workId}/preview`]}>
      <Routes>
        <Route path="/guide/:workId/preview" element={<Preview />} />
        <Route path="/workspace" element={<WorkspaceSpy />} />
        <Route path="/guide/:workId" element={<GuideSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

function setupDefaultMocks({
  work = mockWork,
  files = mockFiles,
  fileContentMap = {
    'SKILL.md': SKILL_CONTENT,
    'config.json': CONFIG_CONTENT,
  } as Record<string, string>,
  claudeDir = '/Users/test/.claude',
  exportSuccess = true,
}: {
  work?: typeof mockWork | null
  files?: typeof mockFiles
  fileContentMap?: Record<string, string>
  claudeDir?: string | null
  exportSuccess?: boolean
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
      return Promise.resolve({ canceled: false, filePaths: ['/new/selected/path'] })
    if (channel === 'file:export')
      return Promise.resolve({ success: exportSuccess, error: exportSuccess ? undefined : '내보내기 실패' })
    if (channel === 'work:update')
      return Promise.resolve({ ...work, status: 'exported', export_path: args[1] as string })
    return Promise.resolve(null)
  })
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe('Preview Integration', () => {
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

  // ========================================================================
  // 시나리오 1: 초기 로드
  // ========================================================================

  describe('시나리오 1: 초기 로드', () => {
    it('작업 + 파일 로드 → 첫 번째 파일 자동 선택 → 에디터에 내용 표시 → 내보내기 경로 자동 감지', async () => {
      setupDefaultMocks()
      renderApp()

      // Loading state
      expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()

      // Wait for load to complete
      await waitFor(() =>
        expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
      )

      // First file auto-selected and content shown
      await waitFor(() =>
        expect(screen.getAllByDisplayValue(/자동화 스킬/).length).toBeGreaterThanOrEqual(1)
      )

      // Export path auto-detected
      const pathInput = screen.getByRole('textbox', { name: '내보내기 경로' })
      expect(pathInput.value).toContain('/Users/test/.claude/skills/')
      expect(pathInput.value).toContain('자동화 스킬')
    })

    it('IPC 호출: work:get-by-id, work-file:get-by-work-id, work-file:read-content, file:detect-claude-dir', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
      )

      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:get-by-id', 1)
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work-file:get-by-work-id', 1)
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work-file:read-content', 'SKILL.md')
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('file:detect-claude-dir')
    })

    it('~/.claude 디렉토리가 없을 때 기본 경로를 사용한다', async () => {
      setupDefaultMocks({ claudeDir: null })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: '내보내기 경로' })).toBeInTheDocument()
      )
      // Should have some path even without claude dir
      const pathInput = screen.getByRole('textbox', { name: '내보내기 경로' })
      expect(pathInput.value).toBeDefined()
    })
  })

  // ========================================================================
  // 시나리오 2: 파일 편집 및 더티 상태
  // ========================================================================

  describe('시나리오 2: 파일 편집 및 더티 상태', () => {
    it('파일 선택 → 내용 편집 → 더티 배지 표시 → 다른 파일 선택 → 되돌아와도 편집 내용 유지', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
      )

      // Wait for content to load
      await waitFor(() =>
        expect(screen.getAllByDisplayValue(/자동화 스킬/).length).toBeGreaterThanOrEqual(1)
      )

      // Edit the content
      const editor = screen.getByRole('textbox', { name: '파일 내용 편집기' })
      fireEvent.change(editor, { target: { value: '# 수정된 내용\n\n수정되었습니다.' } })

      // Dirty badge appears
      await waitFor(() =>
        expect(screen.getByText('수정됨')).toBeInTheDocument()
      )

      // Select another file
      fireEvent.click(screen.getByRole('button', { name: /config\.json/ }))

      // Wait for second file to load
      await waitFor(() =>
        expect(screen.getByDisplayValue(/version/)).toBeInTheDocument()
      )

      // Go back to first file
      fireEvent.click(screen.getByRole('button', { name: /SKILL\.md/ }))

      // Edited content preserved
      await waitFor(() =>
        expect(screen.getByDisplayValue(/수정된 내용/)).toBeInTheDocument()
      )
      expect(screen.getByText('수정됨')).toBeInTheDocument()
    })

    it('다른 파일 전환 시 각 파일의 편집 상태가 독립적으로 유지된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
      )
      await waitFor(() =>
        expect(screen.getAllByDisplayValue(/자동화 스킬/).length).toBeGreaterThanOrEqual(1)
      )

      // Edit first file
      const editor = screen.getByRole('textbox', { name: '파일 내용 편집기' })
      fireEvent.change(editor, { target: { value: '# 첫 번째 파일 수정' } })

      // Switch to second file
      fireEvent.click(screen.getByRole('button', { name: /config\.json/ }))
      await waitFor(() =>
        expect(screen.getByDisplayValue(/version/)).toBeInTheDocument()
      )

      // Second file should not be dirty
      expect(screen.queryByText('수정됨')).not.toBeInTheDocument()

      // Store should have editedContents for file 1 but not file 2
      const state = usePreviewStore.getState()
      expect(state.editedContents[1]).toBe('# 첫 번째 파일 수정')
      expect(state.editedContents[2]).toBeUndefined()
    })
  })

  // ========================================================================
  // 시나리오 3: 내보내기 플로우
  // ========================================================================

  describe('시나리오 3: 내보내기 플로우', () => {
    it('내보내기 버튼 클릭 → 모든 파일 내보내기 → 상태 업데이트 → 성공 메시지 → 워크스페이스 이동 옵션', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
      )

      // Click export
      fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

      // Success message appears
      await waitFor(() =>
        expect(screen.getByText(/내보내기 완료/i)).toBeInTheDocument()
      )

      // Workspace navigation button appears
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /워크스페이스/i })).toBeInTheDocument()
      )
    })

    it('내보내기 시 file:export가 각 파일에 대해 호출된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'file:export',
          expect.stringContaining('SKILL.md'),
          expect.any(String)
        )
      })
    })

    it('내보내기 성공 시 work:update가 exported 상태로 호출된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'work:update',
          1,
          expect.objectContaining({ status: 'exported' })
        )
      })
    })

    it('내보내기 성공 후 워크스페이스 버튼 클릭 시 /workspace로 이동한다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /워크스페이스/i })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: /워크스페이스/i }))

      await waitFor(() =>
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument()
      )
    })

    it('내보내기 실패 시 에러 메시지를 표시한다', async () => {
      setupDefaultMocks({ exportSuccess: false })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

      await waitFor(() =>
        expect(screen.getByText(/내보내기 실패/i)).toBeInTheDocument()
      )
    })
  })
})
