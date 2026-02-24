// @TASK P4-S1-T1 - Work Card Component
// @SPEC docs/planning/03-user-flow.md#workspace
// @TEST src/pages/Workspace.test.tsx

import { Link } from 'react-router-dom'
import TypeBadge from '../ui/TypeBadge'
import StatusBadge from '../ui/StatusBadge'
import type { Work } from '../../types/work'

interface WorkCardProps {
  work: Work
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function WorkCard({ work }: WorkCardProps): React.ReactElement {
  return (
    <Link to={`/workspace/${work.id}`} className="block group">
      <div className="bg-surface border border-elevated rounded-lg p-4 transition-colors hover:border-primary/30 cursor-pointer h-full flex flex-col gap-3">
        {/* Header: name + type badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-text-primary font-medium text-sm leading-snug line-clamp-2 flex-1">
            {work.name}
          </h3>
          <TypeBadge type={work.type} />
        </div>

        {/* Status badge */}
        <div>
          <StatusBadge status={work.status} />
        </div>

        {/* Footer: updated date */}
        <div className="mt-auto pt-1">
          <p className="text-text-secondary text-xs">
            수정일: {formatDate(work.updated_at)}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default WorkCard
