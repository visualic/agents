// @TASK P2-S2-T1 - Pattern Grid Component
// @SPEC docs/planning/03-user-flow.md#pattern-library
// @TEST src/pages/PatternLibrary.test.tsx

import PatternCard from './PatternCard'
import type { Pattern } from '../../types/pattern'

interface PatternGridProps {
  patterns: Pattern[]
}

function PatternGrid({ patterns }: PatternGridProps): React.ReactElement {
  if (patterns.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-secondary text-sm">패턴이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {patterns.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} />
      ))}
    </div>
  )
}

export default PatternGrid
