// @TASK P3-S1-T1 - Guide Step Indicator Component
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { STEP_LABELS } from '../../stores/guideStore'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  currentStep: number // 1-5
  onStepClick?: (step: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps): React.ReactElement {
  const steps = [1, 2, 3, 4, 5]

  return (
    <nav aria-label="가이드 단계" className="flex items-center gap-1 py-3 px-4 overflow-x-auto">
      {steps.map((step) => {
        const isActive = step === currentStep
        const isCompleted = step < currentStep
        const isClickable = isCompleted && !!onStepClick

        return (
          <div key={step} className="flex items-center">
            <button
              type="button"
              aria-current={isActive ? 'step' : undefined}
              aria-label={`${step}단계: ${STEP_LABELS[step]}`}
              onClick={isClickable ? () => onStepClick(step) : undefined}
              disabled={!isClickable && !isActive}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary text-white'
                  : isCompleted
                  ? 'bg-elevated text-text-primary cursor-pointer hover:bg-elevated/80'
                  : 'bg-surface text-text-secondary cursor-not-allowed opacity-50',
              ].join(' ')}
            >
              <span
                className={[
                  'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  isActive
                    ? 'bg-white text-primary'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-elevated text-text-secondary',
                ].join(' ')}
              >
                {isCompleted ? '✓' : step}
              </span>
              {STEP_LABELS[step]}
            </button>

            {/* Connector line between steps */}
            {step < 5 && (
              <span
                className={[
                  'w-6 h-0.5 mx-0.5 shrink-0',
                  step < currentStep ? 'bg-green-500' : 'bg-elevated',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default StepIndicator
