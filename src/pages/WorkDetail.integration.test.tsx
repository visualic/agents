// @TASK P4-S2-T2 - WorkDetail Page Integration Tests
// @SPEC docs/planning/03-user-flow.md#work-detail

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
// Spy pages
// ---------------------------------------------------------------------------

function WorkspaceSpy() {
  return <div data-testid="workspace-page">워크스페이스 페이지</div>
}

function GuideSpy() {
  return <div data-testid="guide-page">가이드 페이지</div>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderApp(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/workspace/${id}`]}>
      <Routes>
        <Route path="/workspace/:id" element={<WorkDetail />} />
        <Route path="/workspace" element={<WorkspaceSpy />} />
        <Route path="/guide/:id" element={<GuideSpy />} />
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
      return Promise.resolve({ canceled: false, filePaths: ['/new/selected/path'] })
    if (channel === 'file:export')
      return Promise.resolve({ success: exportSuccess, error: exportSuccess ? undefined : '내보내기 실패' })
    if (channel === 'work:update')
      return Promise.resolve({ ...work, status: 'exported', export_path: args[1] as string })
    if (channel === 'work:delete')
      return deleteSuccess ? Promise.resolve() : Promise.reject(new Error('삭제 실패'))
    return Promise.resolve(null)
  })
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe('WorkDetail Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ========================================================================
  // 시나리오 1: 초기 로드
  // ========================================================================

  describe('시나리오 1: 초기 로드', () => {
    it('페이지 로드 시 워크 헤더, 파일 트리, 첫 번째 파일이 에디터에 표시된다', async () => {
      setupDefaultMocks()
      renderApp()

      // Loading state
      expect(screen.getByText(/불러오는 중/i)).toBeInTheDocument()

      // Wait for load to complete
      await waitFor(() =>
        expect(screen.getAllByText('자동화 스킬').length).toBeGreaterThanOrEqual(1)
      )

      // WorkHeader: name, badges
      expect(screen.getByText('스킬')).toBeInTheDocument()
      expect(screen.getByText('내보냄')).toBeInTheDocument()

      // File tree
      expect(screen.getAllByText('SKILL.md').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('config.json').length).toBeGreaterThanOrEqual(1)

      // First file auto-selected and content shown
      await waitFor(() =>
        expect(screen.getByDisplayValue(/자동화 스킬/)).toBeInTheDocument()
      )
    })

    it('IPC 호출: work:get-by-id, work-file:get-by-work-id, work-file:read-content, file:detect-claude-dir', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getAllByText('자동화 스킬').length).toBeGreaterThanOrEqual(1)
      )

      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:get-by-id', 1)
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work-file:get-by-work-id', 1)
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work-file:read-content', 'SKILL.md')
      expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('file:detect-claude-dir')
    })

    it('브레드크럼이 홈 > 내 작업실 > 작업명 순으로 표시된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByText('홈')).toBeInTheDocument()
      )
      expect(screen.getByText('내 작업실')).toBeInTheDocument()
      expect(screen.getAllByText('자동화 스킬').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ========================================================================
  // 시나리오 2: 파일 편집 및 더티 상태
  // ========================================================================

  describe('시나리오 2: 파일 편집 및 더티 상태', () => {
    it('파일 편집 → 더티 배지 표시 → 다른 파일로 전환 후 복귀해도 내용 유지', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByDisplayValue(/자동화 스킬/)).toBeInTheDocument()
      )

      // Edit the content
      const editor = screen.getByRole('textbox', { name: '파일 내용 편집기' })
      fireEvent.change(editor, { target: { value: '# 수정된 내용\n\n수정되었습니다.' } })

      // Dirty badge appears
      await waitFor(() =>
        expect(screen.getByText('수정됨')).toBeInTheDocument()
      )

      // Switch to second file
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

    it('두 번째 파일로 전환 시 더티 상태가 독립적으로 유지된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByDisplayValue(/자동화 스킬/)).toBeInTheDocument()
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
    })
  })

  // ========================================================================
  // 시나리오 3: 재내보내기
  // ========================================================================

  describe('시나리오 3: 재내보내기', () => {
    it('재내보내기 버튼 클릭 → 파일 내보내기 → 성공 토스트 표시', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '재내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '재내보내기' }))

      // file:export should be called
      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'file:export',
          expect.stringContaining('SKILL.md'),
          expect.any(String)
        )
      })

      // Success toast appears
      await waitFor(() =>
        expect(screen.getByText(/내보내기 완료/i)).toBeInTheDocument()
      )
    })

    it('재내보내기 성공 시 work:update가 exported 상태로 호출된다', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '재내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '재내보내기' }))

      await waitFor(() => {
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith(
          'work:update',
          1,
          expect.objectContaining({ status: 'exported' })
        )
      })
    })

    it('재내보내기 실패 시 에러 토스트를 표시한다', async () => {
      setupDefaultMocks({ exportSuccess: false })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '재내보내기' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '재내보내기' }))

      await waitFor(() =>
        expect(screen.getByRole('alert')).toBeInTheDocument()
      )
    })
  })

  // ========================================================================
  // 시나리오 4: 삭제
  // ========================================================================

  describe('시나리오 4: 삭제', () => {
    it('삭제 버튼 클릭 → 확인 모달 → 확인 → work:delete 호출 → /workspace 이동', async () => {
      setupDefaultMocks()
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
      )

      // Open delete modal
      fireEvent.click(screen.getByRole('button', { name: '삭제' }))

      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: '삭제 확인' })).toBeInTheDocument()
      )

      // Work name shown in modal
      expect(screen.getAllByText('자동화 스킬').length).toBeGreaterThanOrEqual(1)

      // Find and click the confirm button inside the modal
      const modal = screen.getByRole('dialog', { name: '삭제 확인' })
      const confirmBtn = modal.querySelector('button[aria-label="삭제 확인"]') as HTMLElement
      fireEvent.click(confirmBtn)

      // work:delete should be called
      await waitFor(() =>
        expect(vi.mocked(ipc.invoke)).toHaveBeenCalledWith('work:delete', 1)
      )

      // Navigate to workspace
      await waitFor(() =>
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument()
      )
    })

    it('모달에서 취소 클릭 시 모달이 닫히고 삭제가 실행되지 않는다', async () => {
      setupDefaultMocks()
      renderApp()

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

      // work:delete should NOT have been called
      expect(vi.mocked(ipc.invoke)).not.toHaveBeenCalledWith('work:delete', expect.anything())
    })

    it('삭제 실패 시 에러 토스트를 표시하고 모달이 닫힌다', async () => {
      setupDefaultMocks({ deleteSuccess: false })
      renderApp()

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
      )

      fireEvent.click(screen.getByRole('button', { name: '삭제' }))

      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: '삭제 확인' })).toBeInTheDocument()
      )

      const modal = screen.getByRole('dialog', { name: '삭제 확인' })
      const confirmBtn = modal.querySelector('button[aria-label="삭제 확인"]') as HTMLElement
      fireEvent.click(confirmBtn)

      await waitFor(() =>
        expect(screen.getByRole('alert')).toBeInTheDocument()
      )

      // Modal should be closed
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: '삭제 확인' })).not.toBeInTheDocument()
      )
    })
  })
})
