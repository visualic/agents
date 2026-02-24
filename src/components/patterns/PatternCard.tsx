// @TASK P2-S2-T1 - Pattern Card Component
// @SPEC docs/planning/03-user-flow.md#pattern-library
// @TEST src/pages/PatternLibrary.test.tsx

import { Link } from 'react-router-dom'
import TypeBadge from '../ui/TypeBadge'
import type { Pattern } from '../../types/pattern'

interface PatternCardProps {
  pattern: Pattern
}

function PatternCard({ pattern }: PatternCardProps): React.ReactElement {
  const tags = pattern.tag_names?.split(',').filter(Boolean) ?? []

  return (
    <Link to={`/patterns/${pattern.id}`} className="block group">
      <div className="bg-surface border border-elevated rounded-lg p-4 transition-colors hover:border-primary/30 cursor-pointer h-full flex flex-col gap-3">
        {/* Header: name + type badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-text-primary font-medium text-sm leading-snug line-clamp-2 flex-1">
            {pattern.name}
          </h3>
          <TypeBadge type={pattern.type} />
        </div>

        {/* Description */}
        {pattern.description && (
          <p className="text-text-secondary text-sm line-clamp-2 leading-relaxed">
            {pattern.description}
          </p>
        )}

        {/* Structure preview */}
        {pattern.structure_preview && (
          <pre className="text-xs text-text-secondary bg-elevated rounded px-2 py-1.5 overflow-hidden line-clamp-2 font-mono">
            {pattern.structure_preview}
          </pre>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
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
      </div>
    </Link>
  )
}

export default PatternCard
