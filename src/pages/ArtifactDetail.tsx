import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Breadcrumb from '../components/layout/Breadcrumb'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import ArtifactStatusBadge from '../components/discovery/ArtifactStatusBadge'
import ScoreBar from '../components/discovery/ScoreBar'
import ScoreBreakdownPanel from '../components/discovery/ScoreBreakdownPanel'
import VerificationChecklist from '../components/discovery/VerificationChecklist'
import { ipc } from '../lib/ipc'
import type { Artifact } from '../types/artifact'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  skill: '스킬',
  agent: '에이전트',
  orchestration: '오케스트레이션',
  tooling: '도구',
  reference: '참조'
}

interface ToastState {
  type: 'success' | 'error'
  message: string
}

// ---------------------------------------------------------------------------
// ArtifactDetail Page
// ---------------------------------------------------------------------------

function ArtifactDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    async function fetchData() {
      try {
        setLoading(true)
        const data = await ipc.invoke<Artifact | null>('discovery:get-artifact', Number(id))
        setArtifact(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '아티팩트를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  async function handleVerify(notes?: string) {
    if (!artifact) return
    setActionLoading(true)
    try {
      await ipc.invoke('discovery:verify', artifact.id, notes)
      setArtifact({ ...artifact, status: 'verified', curation_notes: notes || null })
      setToast({ type: 'success', message: '검증 완료' })
    } catch (err) {
      setToast({ type: 'error', message: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(notes?: string) {
    if (!artifact) return
    setActionLoading(true)
    try {
      await ipc.invoke('discovery:reject', artifact.id, notes)
      setArtifact({ ...artifact, status: 'rejected', curation_notes: notes || null })
      setToast({ type: 'success', message: '거부됨' })
    } catch (err) {
      setToast({ type: 'error', message: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePromote() {
    if (!artifact) return
    setActionLoading(true)
    try {
      await ipc.invoke('discovery:promote', artifact.id)
      setArtifact({ ...artifact, status: 'promoted' })
      setToast({ type: 'success', message: '패턴으로 승격되었습니다.' })
    } catch (err) {
      setToast({ type: 'error', message: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!artifact) return
    setActionLoading(true)
    try {
      await ipc.invoke('discovery:delete', artifact.id)
      navigate('/discover')
    } catch (err) {
      setToast({ type: 'error', message: (err as Error).message })
      setActionLoading(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!artifact) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">아티팩트를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const tags = artifact.tags ?? []
  const meta = artifact.meta as Record<string, unknown> | null
  const canPromote = artifact.status === 'verified'
  const canVerify = ['curated', 'review'].includes(artifact.status)

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '디스커버리', href: '/discover' },
          { label: artifact.title }
        ]}
      />

      {/* Main layout */}
      <div className="mt-4 flex gap-6">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="bg-surface border border-elevated rounded-lg p-6">
            <div className="flex items-start gap-3 mb-3">
              <h1 className="text-text-primary text-xl font-bold flex-1">{artifact.title}</h1>
              <ArtifactStatusBadge status={artifact.status} />
            </div>

            {artifact.summary && (
              <p className="text-text-secondary text-sm leading-relaxed mb-4">{artifact.summary}</p>
            )}

            {/* Score bar */}
            <div className="mb-4">
              <ScoreBar score={artifact.score_total} />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs text-text-secondary bg-elevated px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              <span>타입: {TYPE_LABELS[artifact.artifact_type] || artifact.artifact_type}</span>
              {artifact.source_url && (
                <a href={artifact.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {artifact.source_owner}/{artifact.source_repo}
                </a>
              )}
              <span>라이선스: {artifact.license}</span>
              <span>Run: {artifact.run_id}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {canPromote && (
              <Button onClick={handlePromote} disabled={actionLoading}>패턴으로 승격</Button>
            )}
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading} size="sm">
              삭제
            </Button>
          </div>

          {/* Score breakdown */}
          {artifact.quality_scores && (
            <ScoreBreakdownPanel scores={artifact.quality_scores} />
          )}

          {/* Evidence snippets */}
          {artifact.evidence_snippets && artifact.evidence_snippets.length > 0 && (
            <div>
              <h2 className="text-text-primary text-sm font-semibold mb-3">증거 스니펫</h2>
              <div className="space-y-2">
                {artifact.evidence_snippets.map((snippet, i) => (
                  <pre key={i} className="bg-elevated rounded p-3 text-xs text-text-secondary font-mono overflow-x-auto">
                    {snippet}
                  </pre>
                ))}
              </div>
            </div>
          )}

          {/* README preview */}
          {artifact.readme_content && (
            <div>
              <h2 className="text-text-primary text-sm font-semibold mb-3">README</h2>
              <pre className="bg-elevated rounded p-4 text-sm text-text-secondary font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                {artifact.readme_content}
              </pre>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 space-y-6">
          {/* Verification Checklist */}
          {canVerify && (
            <VerificationChecklist
              onVerify={handleVerify}
              onReject={handleReject}
              disabled={actionLoading}
            />
          )}

          {/* Metadata */}
          <div className="bg-surface border border-elevated rounded-lg p-4">
            <h3 className="text-text-primary font-semibold text-sm mb-3">메타데이터</h3>
            <dl className="space-y-2 text-sm">
              {meta?.stars !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Stars</dt>
                  <dd className="text-text-primary">{String(meta.stars)}</dd>
                </div>
              )}
              {meta?.open_issues !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Open Issues</dt>
                  <dd className="text-text-primary">{String(meta.open_issues)}</dd>
                </div>
              )}
              {meta?.archived !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Archived</dt>
                  <dd className="text-text-primary">{meta.archived ? 'Yes' : 'No'}</dd>
                </div>
              )}
              {meta?.fork !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Fork</dt>
                  <dd className="text-text-primary">{meta.fork ? 'Yes' : 'No'}</dd>
                </div>
              )}
              {meta?.pushed_at && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Last Push</dt>
                  <dd className="text-text-primary text-xs">
                    {new Date(String(meta.pushed_at)).toLocaleDateString('ko-KR')}
                  </dd>
                </div>
              )}
              {artifact.curation_notes && (
                <div className="pt-2 border-t border-elevated">
                  <dt className="text-text-secondary mb-1">큐레이션 메모</dt>
                  <dd className="text-text-primary text-xs">{artifact.curation_notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ArtifactDetail
