// @TASK P3-S1-T1 - Guide Dialogue Zustand Store
// @SPEC docs/planning/03-user-flow.md#guide-dialogue
// @TEST src/pages/GuideDialogue.test.tsx

import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { Work } from '../types/work'
import type { GuideSession, ChatMessage } from '../types/guide'
import type { Pattern } from '../types/pattern'

// ---------------------------------------------------------------------------
// Step system prompts
// ---------------------------------------------------------------------------

const STEP_SYSTEM_PROMPTS: Record<number, string> = {
  1: '당신은 사용자가 Claude Code {type}의 유형과 목적을 정의하는 것을 돕고 있습니다. 유형(스킬/에이전트/오케스트레이션)과 주요 목적, 해결하려는 문제를 명확하게 파악해 주세요.',
  2: '사용자가 {type}의 트리거 조건을 정의하도록 도와주세요. 언제, 어떤 상황에서 이 {type}이 활성화되는지 구체적으로 파악해 주세요.',
  3: '사용자가 {type}의 파일 구조와 핵심 컴포넌트를 설계하도록 도와주세요. 필요한 파일, 디렉토리 구조, 주요 섹션을 정의해 주세요.',
  4: '사용자가 {type}에 필요한 도구와 권한을 명시하도록 도와주세요. 어떤 Claude 도구를 사용하는지, 어떤 파일/시스템 접근 권한이 필요한지 파악해 주세요.',
  5: '지금까지의 설계를 요약하고 미리보기를 준비해 주세요. 유형/목적, 트리거, 구조, 도구/권한을 간결하게 정리하고 최종 확인을 요청해 주세요.',
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface GuideState {
  work: Work | null
  session: GuideSession | null
  basePattern: Pattern | null
  messages: ChatMessage[]
  currentStep: number // 1-5
  isStreaming: boolean
  claudeAvailable: boolean
  designState: Record<string, string> // accumulated per-step results
  loading: boolean
  error: string | null
  // Actions
  initGuide: (workId: number) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  goToStep: (step: number) => Promise<void>
  nextStep: () => Promise<void>
  prevStep: () => Promise<void>
  reset: () => void
}

// ---------------------------------------------------------------------------
// Helper: resolve system prompt with work type
// ---------------------------------------------------------------------------

function resolvePrompt(step: number, workType: string): string {
  return STEP_SYSTEM_PROMPTS[step]?.replace(/\{type\}/g, workType) ?? ''
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGuideStore = create<GuideState>((set, get) => ({
  work: null,
  session: null,
  basePattern: null,
  messages: [],
  currentStep: 1,
  isStreaming: false,
  claudeAvailable: false,
  designState: {},
  loading: false,
  error: null,

  reset: () => {
    set({
      work: null,
      session: null,
      basePattern: null,
      messages: [],
      currentStep: 1,
      isStreaming: false,
      claudeAvailable: false,
      designState: {},
      loading: false,
      error: null,
    })
  },

  initGuide: async (workId: number) => {
    set({ loading: true, error: null })
    try {
      // Load work and check Claude availability in parallel
      const [work, claudeAvailable] = await Promise.all([
        ipc.invoke<Work>('work:get-by-id', workId),
        ipc.invoke<boolean>('claude:check-availability'),
      ])

      if (!work) {
        set({ loading: false, error: '작업을 찾을 수 없습니다.' })
        return
      }

      // Load or create guide session
      let session = await ipc.invoke<GuideSession | null>('guide:get-by-work-id', workId)
      if (!session) {
        session = await ipc.invoke<GuideSession>('guide:create', workId)
      }

      // Determine current step from session
      const stepNum = session?.current_step
        ? parseInt(session.current_step.replace('step', ''), 10)
        : 1

      // Load existing conversation
      const messages = session
        ? (await ipc.invoke<ChatMessage[]>('guide:get-conversation', session.id)) ?? []
        : []

      // Load base pattern if work has one
      let basePattern: Pattern | null = null
      if (work.base_pattern_id) {
        basePattern = await ipc.invoke<Pattern | null>('pattern:get-by-id', work.base_pattern_id)
      }

      set({
        work,
        session,
        basePattern,
        messages,
        currentStep: stepNum,
        claudeAvailable: claudeAvailable ?? false,
        loading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '가이드를 초기화하지 못했습니다.',
        loading: false,
      })
    }
  },

  sendMessage: async (content: string) => {
    const { session, work, currentStep, messages } = get()
    if (!session || !work) return

    const timestamp = new Date().toISOString()

    // Add user message to local state immediately
    const userMessage: ChatMessage = { role: 'user', content, timestamp }
    set((state) => ({ messages: [...state.messages, userMessage] }))

    // Persist user message
    await ipc.invoke('guide:add-message', session.id, userMessage)

    set({ isStreaming: true })

    try {
      const systemPrompt = resolvePrompt(currentStep, work.type)
      const response = await ipc.invoke<string>('claude:send-message', content, systemPrompt)

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response ?? '',
        timestamp: new Date().toISOString(),
      }

      // Persist AI message
      await ipc.invoke('guide:add-message', session.id, aiMessage)

      // Update design state for current step
      const stepKey = `step${currentStep}`
      set((state) => ({
        messages: [...state.messages, aiMessage],
        isStreaming: false,
        designState: {
          ...state.designState,
          [stepKey]: response ?? '',
        },
      }))
    } catch (err) {
      set({ isStreaming: false, error: err instanceof Error ? err.message : '메시지 전송 실패' })
    }
  },

  goToStep: async (step: number) => {
    const { session } = get()
    if (!session) return
    const stepKey = `step${step}` as GuideSession['current_step']
    await ipc.invoke('guide:update-step', session.id, stepKey)
    set({ currentStep: step })
  },

  nextStep: async () => {
    const { currentStep } = get()
    if (currentStep < 5) {
      await get().goToStep(currentStep + 1)
    }
  },

  prevStep: async () => {
    const { currentStep } = get()
    if (currentStep > 1) {
      await get().goToStep(currentStep - 1)
    }
  },
}))

// ---------------------------------------------------------------------------
// Step labels (Korean)
// ---------------------------------------------------------------------------

export const STEP_LABELS: Record<number, string> = {
  1: '유형/목적',
  2: '트리거',
  3: '구조',
  4: '도구/권한',
  5: '미리보기',
}
