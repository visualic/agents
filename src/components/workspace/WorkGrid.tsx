// @TASK P4-S1-T1 - Work Grid Component
// @SPEC docs/planning/03-user-flow.md#workspace
// @TEST src/pages/Workspace.test.tsx

import WorkCard from './WorkCard'
import type { Work } from '../../types/work'

interface WorkGridProps {
  works: Work[]
}

function WorkGrid({ works }: WorkGridProps): React.ReactElement {
  if (works.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-secondary text-sm">작업물이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {works.map((work) => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  )
}

export default WorkGrid
