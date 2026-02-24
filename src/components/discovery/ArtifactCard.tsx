import { Link } from 'react-router-dom'
import ArtifactStatusBadge from './ArtifactStatusBadge'
import ScoreBar from './ScoreBar'
import type { Artifact } from '../../types/artifact'

interface ArtifactCardProps {
  artifact: Artifact
}

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  skill: { label: '스킬', className: 'bg-skill' },
  agent: { label: '에이전트', className: 'bg-agent' },
  orchestration: { label: '오케스트레이션', className: 'bg-orchestration' },
  tooling: { label: '도구', className: 'bg-blue-700' },
  reference: { label: '참조', className: 'bg-gray-600' },
}

function ArtifactCard({ artifact }: ArtifactCardProps): React.ReactElement {
  const typeConfig = TYPE_LABELS[artifact.artifact_type] || TYPE_LABELS.reference
  const tags = artifact.tags ?? []
  const meta = artifact.meta as Record<string, unknown> | null

  return (
    <Link to={`/discover/${artifact.id}`} className="block group">
      <div className="bg-surface border border-elevated rounded-lg p-4 transition-colors hover:border-primary/30 cursor-pointer h-full flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-text-primary font-medium text-sm leading-snug line-clamp-2 flex-1">
            {artifact.title}
          </h3>
          <div className="flex gap-1.5 shrink-0">
            <span className={`${typeConfig.className} text-white text-xs font-medium px-2 py-0.5 rounded-full`}>
              {typeConfig.label}
            </span>
            <ArtifactStatusBadge status={artifact.status} />
          </div>
        </div>

        {/* Summary */}
        {artifact.summary && (
          <p className="text-text-secondary text-sm line-clamp-2 leading-relaxed">
            {artifact.summary}
          </p>
        )}

        {/* Score */}
        <ScoreBar score={artifact.score_total} size="sm" />

        {/* Bottom: tags + meta */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs text-text-secondary bg-elevated px-2 py-0.5 rounded-full truncate max-w-[100px]"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-text-secondary">+{tags.length - 3}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
            {meta?.stars !== undefined && <span>{String(meta.stars)} stars</span>}
            {artifact.license !== 'UNKNOWN' && <span>{artifact.license}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ArtifactCard
