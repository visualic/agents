// @TASK P3-S2-T1 - Preview Page
// @SPEC docs/planning/03-user-flow.md#preview
// @TEST src/pages/Preview.test.tsx

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Breadcrumb from '../components/layout/Breadcrumb'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import FileTree from '../components/editor/FileTree'
import MarkdownEditor from '../components/editor/MarkdownEditor'
import { usePreviewStore } from '../stores/previewStore'

// ---------------------------------------------------------------------------
// Preview Page
// ---------------------------------------------------------------------------

function Preview(): React.ReactElement {
  const { workId } = useParams<{ workId: string }>()
  const navigate = useNavigate()

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [exportDone, setExportDone] = useState(false)

  const {
    work,
    files,
    selectedFileId,
    fileContents,
    editedContents,
    exportPath,
    loading,
    exporting,
    error,
    initPreview,
    selectFile,
    updateContent,
    browseDirectory,
    exportFiles,
    reset,
  } = usePreviewStore()

  // Initialize on mount
  useEffect(() => {
    if (!workId) return
    reset()
    setExportDone(false)
    initPreview(Number(workId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId])

  // ----- Derived state -----

  const selectedFile = selectedFileId !== null
    ? files.find((f) => f.id === selectedFileId) ?? null
    : null

  const currentContent =
    selectedFileId !== null
      ? (editedContents[selectedFileId] ?? fileContents[selectedFileId] ?? '')
      : ''

  const originalContent =
    selectedFileId !== null ? (fileContents[selectedFileId] ?? '') : ''

  // ----- Handlers -----

  async function handleSelectFile(fileId: number) {
    await selectFile(fileId)
  }

  function handleContentChange(fileId: number, content: string) {
    updateContent(fileId, content)
  }

  async function handleBrowse() {
    await browseDirectory()
  }

  async function handleExport() {
    const result = await exportFiles()
    if (result.success) {
      setToast({ type: 'success', message: '내보내기 완료! 파일이 성공적으로 저장되었습니다.' })
      setExportDone(true)
    } else {
      setToast({ type: 'error', message: result.error ?? '내보내기 실패' })
    }
  }

  function handleGoToGuide() {
    navigate(`/guide/${workId}`)
  }

  function handleGoToWorkspace() {
    navigate('/workspace')
  }

  // ----- Loading state -----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48" data-testid="preview-loading">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // ----- Error state -----

  if (error && !work) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // ----- Main render -----

  return (
    <div className="flex flex-col h-full p-4 gap-0">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '가이드', href: workId ? `/guide/${workId}` : '/guide' },
          { label: work?.name ?? '...' },
          { label: '미리보기' },
        ]}
      />

      {/* Main content: FileTree + MarkdownEditor */}
      <div className="flex flex-1 min-h-0 gap-0 border border-elevated rounded-lg overflow-hidden">
        {/* Sidebar: FileTree */}
        <div className="w-56 flex-shrink-0 border-r border-elevated bg-surface overflow-y-auto">
          <div className="px-3 py-2 border-b border-elevated">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">파일</span>
          </div>
          <FileTree
            files={files}
            selectedFileId={selectedFileId}
            onSelect={handleSelectFile}
          />
        </div>

        {/* Main area: MarkdownEditor */}
        <div className="flex flex-col flex-1 min-w-0 bg-bg-base overflow-hidden">
          {selectedFile && (
            <div className="px-3 py-1.5 border-b border-elevated bg-surface/50">
              <span className="text-xs text-text-secondary font-mono">{selectedFile.file_path}</span>
            </div>
          )}
          <MarkdownEditor
            fileId={selectedFileId}
            content={currentContent}
            originalContent={originalContent}
            onChange={handleContentChange}
          />
        </div>
      </div>

      {/* Export config bar */}
      <div className="mt-4 p-4 bg-surface border border-elevated rounded-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Export path */}
          <div className="flex-1 flex items-center gap-2">
            <label
              htmlFor="export-path"
              className="text-sm text-text-secondary whitespace-nowrap"
            >
              내보내기 경로:
            </label>
            <input
              id="export-path"
              type="text"
              value={exportPath}
              onChange={(e) =>
                usePreviewStore.setState({ exportPath: e.target.value })
              }
              aria-label="내보내기 경로"
              className="flex-1 bg-bg-base border border-elevated rounded-md px-3 py-1.5 text-text-primary text-sm font-mono focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBrowse}
              disabled={exporting}
            >
              찾아보기
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleGoToGuide}
              disabled={exporting}
            >
              수정하기
            </Button>

            {exportDone ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleGoToWorkspace}
              >
                워크스페이스로 이동
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? '내보내는 중...' : '내보내기'}
              </Button>
            )}
          </div>
        </div>

        {/* Export error */}
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            내보내기 실패: {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default Preview
