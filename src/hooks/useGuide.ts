// @TASK P3-S1-T1 - Guide Step Logic Hook
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuideStore } from '../stores/guideStore'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseGuideReturn {
  hasExchangeInStep: boolean
  canGoNext: boolean
  canGoPrev: boolean
  handleNext: () => Promise<void>
  handlePrev: () => void
}

export function useGuide(workId: number): UseGuideReturn {
  const navigate = useNavigate()
  const {
    initGuide,
    currentStep,
    messages,
    nextStep,
    prevStep,
    reset,
  } = useGuideStore()

  useEffect(() => {
    reset()
    initGuide(workId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId])

  // Determine if there has been at least one user-AI exchange in this step.
  // We use a heuristic: any assistant message exists in messages (simple check
  // since we track messages accumulated across the full session but the step
  // indicator tells the user which step they're on).
  const hasExchangeInStep = messages.some((m) => m.role === 'assistant')

  const canGoNext = hasExchangeInStep && currentStep <= 5
  const canGoPrev = currentStep > 1

  const handleNext = async () => {
    if (currentStep === 5) {
      // Navigate to preview
      const { work } = useGuideStore.getState()
      if (work) {
        navigate(`/guide/${work.id}/preview`)
      }
      return
    }
    await nextStep()
  }

  const handlePrev = () => {
    prevStep()
  }

  return { hasExchangeInStep, canGoNext, canGoPrev, handleNext, handlePrev }
}
