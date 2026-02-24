// @TASK P2-S3-T1 - Pattern Detail Page
// @SPEC docs/planning/03-user-flow.md#pattern-detail
// @TEST src/pages/PatternDetail.test.tsx

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Breadcrumb from '../components/layout/Breadcrumb'
import Button from '../components/ui/Button'
import TypeBadge from '../components/ui/TypeBadge'
import Toast from '../components/ui/Toast'
import PatternCard from '../components/patterns/PatternCard'
import StructurePreview from '../components/patterns/StructurePreview'
import CodeViewer from '../components/editor/CodeViewer'
import { ipc } from '../lib/ipc'
import type { Pattern } from '../types/pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToastState {
  type: 'success' | 'error'
  message: string
}

// ---------------------------------------------------------------------------
// PatternDetail Page
// ---------------------------------------------------------------------------

function PatternDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [relatedPatterns, setRelatedPatterns] = useState<Pattern[]>([])
  const [fileContent, setFileContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isGuideLoading, setIsGuideLoading] = useState(false)
  const [isExportLoading, setIsExportLoading] = useState(false)

  // ---- Fetch pattern data on mount ----

  useEffect(() => {
    if (!id) return

    const patternId = Number(id)

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const [fetchedPattern, fetchedRelated] = await Promise.all([
          ipc.invoke<Pattern | null>('pattern:get-by-id', patternId),
          ipc.invoke<Pattern[]>('pattern:get-related', patternId),
        ])

        setPattern(fetchedPattern)
        setRelatedPatterns(fetchedRelated ?? [])

        // Attempt to read file content (non-blocking failure)
        if (fetchedPattern?.file_path) {
          try {
            const content = await ipc.invoke<string>('file:read', fetchedPattern.file_path)
            setFileContent(content ?? '')
          } catch {
            // File read failure is non-fatal
            setFileContent('')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '패턴을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // ---- Handlers ----

  async function handleGuideStart() {
    if (!pattern) return
    setIsGuideLoading(true)
    try {
      const work = await ipc.invoke<{ id: number }>('work:create', {
        name: pattern.name,
        type: pattern.type,
        base_pattern_id: pattern.id,
      })
      navigate(`/guide/${work.id}`)
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : '작업 생성에 실패했습니다.',
      })
    } finally {
      setIsGuideLoading(false)
    }
  }

  async function handleExport() {
    if (!pattern) return
    setIsExportLoading(true)
    try {
      const exportPath = pattern.file_path
      const content = fileContent || pattern.structure_preview || pattern.name
      const result = await ipc.invoke<{ success: boolean; error?: string }>(
        'file:export',
        exportPath,
        content
      )
      if (result?.success) {
        setToast({ type: 'success', message: '파일을 성공적으로 내보냈습니다.' })
      } else {
        setToast({ type: 'error', message: result?.error ?? '내보내기에 실패했습니다.' })
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : '내보내기에 실패했습니다.',
      })
    } finally {
      setIsExportLoading(false)
    }
  }

  // ---- Loading state ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // ---- Error state ----

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // ---- Pattern not found ----

  if (!pattern) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">패턴을 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const tags = pattern.tag_names?.split(',').filter(Boolean) ?? []

  return (
    <div className="p-6">
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
          { label: '패턴 라이브러리', href: '/patterns' },
          { label: pattern.name },
        ]}
      />

      {/* Main layout: content + sidebar */}
      <div className="mt-4 flex gap-6">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Pattern Header */}
          <div className="bg-surface border border-elevated rounded-lg p-6">
            <div className="flex items-start gap-3 mb-3">
              <h1 className="text-text-primary text-xl font-bold flex-1">{pattern.name}</h1>
              <TypeBadge type={pattern.type} />
            </div>

            {pattern.description && (
              <p className="text-text-secondary text-sm leading-relaxed mb-4">
                {pattern.description}
              </p>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-text-secondary bg-elevated px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Source info */}
            <div className="text-xs text-text-secondary">
              {pattern.source === 'internal' ? (
                <span>출처: 내부</span>
              ) : (
                <span>
                  출처:{' '}
                  <a
                    href={pattern.source_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {pattern.source_url}
                  </a>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="primary"
              onClick={handleGuideStart}
              disabled={isGuideLoading}
              aria-busy={isGuideLoading}
            >
              가이드 대화
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={isExportLoading}
              aria-busy={isExportLoading}
            >
              바로 내보내기
            </Button>
            <Button variant="secondary" disabled>
              포크
            </Button>
            <Button variant="secondary" disabled>
              조합
            </Button>
          </div>

          {/* Structure Preview */}
          {pattern.structure_preview && (
            <StructurePreview content={pattern.structure_preview} />
          )}

          {/* Code Viewer */}
          <div>
            <h2 className="text-text-primary text-sm font-semibold mb-3">파일 내용</h2>
            <CodeViewer
              content={fileContent || '(파일 내용을 불러올 수 없습니다.)'}
              filePath={pattern.file_path}
            />
          </div>
        </div>

        {/* Sidebar: Related Patterns */}
        <aside className="w-64 flex-shrink-0">
          <h2 className="text-text-primary text-sm font-semibold mb-3">관련 패턴</h2>
          {relatedPatterns.length === 0 ? (
            <p className="text-text-secondary text-sm">관련 패턴 없음</p>
          ) : (
            <div className="space-y-3">
              {relatedPatterns.slice(0, 3).map((related) => (
                <PatternCard key={related.id} pattern={related} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default PatternDetail
