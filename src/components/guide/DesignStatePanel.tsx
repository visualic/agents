// @TASK P3-S1-T1 - Design State Sidebar Panel Component
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { STEP_LABELS } from '../../stores/guideStore'
import type { Pattern } from '../../types/pattern'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DesignStatePanelProps {
  designState: Record<string, string>
  basePattern: Pattern | null
  currentStep: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DesignStatePanel({
  designState,
  basePattern,
  currentStep,
}: DesignStatePanelProps): React.ReactElement {
  const completedSteps = Object.keys(designState).filter((k) => designState[k])

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col gap-4"
      aria-label="디자인 상태 패널"
    >
      {/* Base Pattern Info (only when pattern-based) */}
      {basePattern && (
        <div className="bg-surface border border-elevated rounded-lg p-4">
          <h3 className="text-text-primary text-xs font-semibold mb-2 uppercase tracking-wide">
            기반 패턴
          </h3>
          <p className="text-text-primary text-sm font-medium">{basePattern.name}</p>
          {basePattern.description && (
            <p className="text-text-secondary text-xs mt-1 leading-relaxed">
              {basePattern.description}
            </p>
          )}
        </div>
      )}

      {/* Design State Accumulation */}
      <div className="bg-surface border border-elevated rounded-lg p-4 flex-1">
        <h3 className="text-text-primary text-xs font-semibold mb-3 uppercase tracking-wide">
          설계 현황
        </h3>

        {completedSteps.length === 0 ? (
          <p className="text-text-secondary text-xs">아직 완료된 단계가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((step) => {
              const key = `step${step}`
              const value = designState[key]
              if (!value) return null

              const isCurrentStep = step === currentStep

              return (
                <div key={key} className="text-xs">
                  <div
                    className={[
                      'font-semibold mb-1',
                      isCurrentStep ? 'text-primary' : 'text-text-secondary',
                    ].join(' ')}
                  >
                    {step}. {STEP_LABELS[step]}
                  </div>
                  <p className="text-text-primary leading-relaxed line-clamp-3">
                    {/* Show first 120 chars as a summary */}
                    {value.length > 120 ? `${value.slice(0, 120)}…` : value}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

export default DesignStatePanel
