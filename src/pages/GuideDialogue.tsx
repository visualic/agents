// @TASK P3-S1-T1 - Guide Dialogue Page
// @SPEC docs/planning/03-user-flow.md#guide-dialogue
// @TEST src/pages/GuideDialogue.test.tsx

import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Breadcrumb from '../components/layout/Breadcrumb'
import Button from '../components/ui/Button'
import StepIndicator from '../components/guide/StepIndicator'
import GuideChat from '../components/guide/GuideChat'
import DesignStatePanel from '../components/guide/DesignStatePanel'
import { useGuideStore } from '../stores/guideStore'

// ---------------------------------------------------------------------------
// GuideDialogue Page
// ---------------------------------------------------------------------------

function GuideDialogue(): React.ReactElement {
  const { workId } = useParams<{ workId: string }>()
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    work,
    session,
    basePattern,
    messages,
    currentStep,
    isStreaming,
    claudeAvailable,
    designState,
    loading,
    error,
    initGuide,
    sendMessage,
    goToStep,
    nextStep,
    prevStep,
    reset,
  } = useGuideStore()

  // Initialize on mount
  useEffect(() => {
    if (!workId) return
    reset()
    initGuide(Number(workId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId])

  // Focus input when not streaming
  useEffect(() => {
    if (!isStreaming && !loading) {
      inputRef.current?.focus()
    }
  }, [isStreaming, loading])

  // ----- Derived state -----

  // At least 1 assistant message exists as a proxy for "has exchanged in step"
  const hasExchange = messages.some((m) => m.role === 'assistant')
  const canGoNext = hasExchange
  const canGoPrev = currentStep > 1

  // ----- Handlers -----

  async function handleSend() {
    const content = inputValue.trim()
    if (!content || isStreaming) return
    setInputValue('')
    await sendMessage(content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleNext() {
    if (currentStep === 5) {
      navigate(`/guide/${workId}/preview`)
      return
    }
    await nextStep()
  }

  // ----- Loading state -----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48" data-testid="guide-loading">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // ----- Error state -----

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // ----- Claude unavailable warning -----

  const claudeWarning = !claudeAvailable && session ? (
    <div
      className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-yellow-400 text-sm mb-4"
      role="alert"
    >
      Claude CLI를 사용할 수 없습니다. Claude가 설치되어 있는지 확인해 주세요.
    </div>
  ) : null

  // ----- Main render -----

  return (
    <div className="flex flex-col h-full p-4 gap-0">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '가이드' },
          { label: work?.name ?? '...'},
        ]}
      />

      {claudeWarning}

      {/* Step Indicator */}
      <div className="bg-surface border border-elevated rounded-t-lg">
        <StepIndicator
          currentStep={currentStep}
          onStepClick={(step) => {
            goToStep(step)
          }}
        />
      </div>

      {/* Main area: chat + sidebar */}
      <div className="flex flex-1 gap-0 min-h-0">
        {/* Left column: chat + input */}
        <div className="flex flex-col flex-1 min-w-0 bg-surface border-x border-b border-elevated rounded-bl-lg">
          {/* Chat area */}
          <GuideChat
            messages={messages}
            isStreaming={isStreaming}
          />

          {/* Divider */}
          <div className="border-t border-elevated" />

          {/* Input row */}
          <div className="p-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              disabled={isStreaming || !session}
              aria-label="메시지 입력"
              className="flex-1 bg-bg-base border border-elevated rounded-md px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={isStreaming || !inputValue.trim() || !session}
              aria-label="전송"
            >
              전송
            </Button>
          </div>

          {/* Step navigation buttons */}
          <div className="px-3 pb-3 flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={prevStep}
              disabled={!canGoPrev || isStreaming}
            >
              이전 단계
            </Button>

            <span className="text-text-secondary text-xs">
              {currentStep} / 5 단계
            </span>

            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              disabled={!canGoNext || isStreaming}
              aria-label={currentStep === 5 ? '완료 및 미리보기' : '다음 단계'}
            >
              {currentStep === 5 ? '완료 및 미리보기' : '다음 단계'}
            </Button>
          </div>
        </div>

        {/* Sidebar: DesignStatePanel */}
        <div className="ml-4">
          <DesignStatePanel
            designState={designState}
            basePattern={basePattern}
            currentStep={currentStep}
          />
        </div>
      </div>
    </div>
  )
}

export default GuideDialogue
