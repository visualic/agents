// @TASK P4-S2-T1 - WorkDetail Page
// @SPEC docs/planning/03-user-flow.md#work-detail
// @TEST src/pages/WorkDetail.test.tsx

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Breadcrumb from '../components/layout/Breadcrumb'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import TypeBadge from '../components/ui/TypeBadge'
import StatusBadge from '../components/ui/StatusBadge'
import FileTree from '../components/editor/FileTree'
import MarkdownEditor from '../components/editor/MarkdownEditor'
import { ipc } from '../lib/ipc'
import type { Work, WorkFile } from '../types/work'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDefaultExportPath(work: Work, claudeDir: string | null): string {
  const base = claudeDir ?? '~/.claude'
  const subDir =
    work.type === 'skill'
      ? 'skills'
      : work.type === 'agent'
      ? 'agents'
      : 'commands'
  return `${base}/${subDir}/${work.name}`
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

// ---------------------------------------------------------------------------
// DeleteModal
// ---------------------------------------------------------------------------

interface DeleteModalProps {
  workName: string
  onCancel: () => void
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteModal({ workName, onCancel, onConfirm, isDeleting }: DeleteModalProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-label="삭제 확인"
        aria-modal="true"
        className="bg-surface border border-elevated rounded-lg p-6 max-w-md w-full mx-4"
      >
        <h2 className="text-text-primary text-lg font-semibold mb-2">작업 삭제</h2>
        <p className="text-text-secondary text-sm mb-4">
          정말 삭제하시겠습니까?
        </p>
        <p className="text-text-primary text-sm font-medium mb-6 bg-bg-base border border-elevated rounded-md px-3 py-2">
          {workName}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            variant="danger"
            size="md"
            aria-label="삭제 확인"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WorkDetail Page
// ---------------------------------------------------------------------------

function WorkDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ----- Page state -----
  const [work, setWork] = useState<Work | null>(null)
  const [files, setFiles] = useState<WorkFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // File content state
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)
  const [fileContents, setFileContents] = useState<Record<number, string>>({})
  const [editedContents, setEditedContents] = useState<Record<number, string>>({})

  // Export state
  const [exportPath, setExportPath] = useState('')
  const [claudeDir, setClaudeDir] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ----- Load file content -----
  const loadFileContent = useCallback(async (fileId: number, filePath: string) => {
    // Use functional updater to avoid stale closure; check inside updater
    let alreadyLoaded = false
    setFileContents((prev) => {
      alreadyLoaded = prev[fileId] !== undefined
      return prev
    })

    if (alreadyLoaded) {
      setSelectedFileId(fileId)
      return
    }

    try {
      const result = await ipc.invoke<{ success: boolean; content?: string; error?: string }>(
        'work-file:read-content',
        filePath
      )
      const content = result?.success ? (result.content ?? '') : ''
      setFileContents((prev) => ({ ...prev, [fileId]: content }))
    } catch {
      setFileContents((prev) => ({ ...prev, [fileId]: '' }))
    }
    setSelectedFileId(fileId)
  }, [])

  // ----- Initialize on mount -----
  useEffect(() => {
    if (!id) return

    async function init() {
      setLoading(true)
      setError(null)

      try {
        const [loadedWork, loadedFiles, detectedClaudeDir] = await Promise.all([
          ipc.invoke<Work>('work:get-by-id', Number(id)),
          ipc.invoke<WorkFile[]>('work-file:get-by-work-id', Number(id)),
          ipc.invoke<string | null>('file:detect-claude-dir'),
        ])

        if (!loadedWork) {
          setError('작업을 찾을 수 없습니다.')
          setLoading(false)
          return
        }

        const resolvedClaudeDir = detectedClaudeDir ?? null
        const defaultExportPath = buildDefaultExportPath(loadedWork, resolvedClaudeDir)

        setWork(loadedWork)
        setFiles(loadedFiles ?? [])
        setClaudeDir(resolvedClaudeDir)
        setExportPath(loadedWork.export_path ?? defaultExportPath)
        setLoading(false)

        // Auto-select first file
        const fileList = loadedFiles ?? []
        if (fileList.length > 0) {
          const firstFile = fileList[0]
          try {
            const result = await ipc.invoke<{ success: boolean; content?: string; error?: string }>(
              'work-file:read-content',
              firstFile.file_path
            )
            const content = result?.success ? (result.content ?? '') : ''
            setFileContents({ [firstFile.id]: content })
          } catch {
            setFileContents({ [firstFile.id]: '' })
          }
          setSelectedFileId(firstFile.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '작업을 불러오지 못했습니다.')
        setLoading(false)
      }
    }

    init()
  }, [id])

  // ----- Derived state -----
  const currentContent =
    selectedFileId !== null
      ? (editedContents[selectedFileId] ?? fileContents[selectedFileId] ?? '')
      : ''

  const originalContent =
    selectedFileId !== null ? (fileContents[selectedFileId] ?? '') : ''

  // ----- Handlers -----
  async function handleSelectFile(fileId: number) {
    const file = files.find((f) => f.id === fileId)
    if (!file) return
    await loadFileContent(fileId, file.file_path)
    setSelectedFileId(fileId)
  }

  function handleContentChange(fileId: number, content: string) {
    const original = fileContents[fileId] ?? ''
    setEditedContents((prev) => {
      const next = { ...prev }
      if (content === original) {
        delete next[fileId]
      } else {
        next[fileId] = content
      }
      return next
    })
  }

  async function handleReExport() {
    if (!work) return
    setExporting(true)

    try {
      const resolvedPath = exportPath || buildDefaultExportPath(work, claudeDir)

      for (const file of files) {
        const content = editedContents[file.id] ?? fileContents[file.id] ?? ''
        const fullPath = `${resolvedPath}/${file.file_path}`
        const result = await ipc.invoke<{ success: boolean; error?: string }>(
          'file:export',
          fullPath,
          content
        )
        if (!result?.success) {
          const errorMsg = result?.error ?? '내보내기 실패'
          setToast({ type: 'error', message: errorMsg })
          setExporting(false)
          return
        }
      }

      await ipc.invoke('work:update', work.id, {
        status: 'exported',
        export_path: resolvedPath,
      })

      setToast({ type: 'success', message: '내보내기 완료! 파일이 성공적으로 저장되었습니다.' })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '내보내기 실패'
      setToast({ type: 'error', message: errorMsg })
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!work) return
    setDeleting(true)
    try {
      await ipc.invoke('work:delete', work.id)
      navigate('/workspace')
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : '삭제 실패',
      })
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // ----- Loading state -----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // ----- Error / not found state -----
  if (error || !work) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">
            {error ?? '작업을 찾을 수 없습니다.'}
          </p>
        </div>
      </div>
    )
  }

  // ----- Main render -----
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteModal
          workName={work.name}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleting}
        />
      )}

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '내 작업실', href: '/workspace' },
          { label: work.name },
        ]}
      />

      {/* WorkHeader */}
      <div className="bg-surface border border-elevated rounded-lg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{work.name}</h1>
            <div className="flex items-center gap-2">
              <TypeBadge type={work.type} />
              <StatusBadge status={work.status} />
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-xs text-text-secondary">
                생성일: {formatDate(work.created_at)}
              </span>
              <span className="text-xs text-text-secondary">
                수정일: {formatDate(work.updated_at)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/guide/${id}`)}
            >
              가이드 재시작
            </Button>
            <Button
              variant="primary"
              size="sm"
              aria-label="재내보내기"
              onClick={handleReExport}
              disabled={exporting}
            >
              {exporting ? '내보내는 중...' : '재내보내기'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              aria-label="삭제"
              onClick={() => setShowDeleteModal(true)}
            >
              삭제
            </Button>
          </div>
        </div>

        {/* Export path row */}
        {work.export_path && (
          <div className="mt-3 pt-3 border-t border-elevated">
            <span className="text-xs text-text-secondary font-mono">
              내보내기 경로: {work.export_path}
            </span>
          </div>
        )}
      </div>

      {/* Main area: FileTree + Editor */}
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
          <MarkdownEditor
            fileId={selectedFileId}
            content={currentContent}
            originalContent={originalContent}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  )
}

export default WorkDetail
