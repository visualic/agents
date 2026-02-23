export type GuideStep = 'step1' | 'step2' | 'step3' | 'step4' | 'step5'

export interface GuideSession {
  id: number
  work_id: number
  current_step: GuideStep | null
  conversation_log: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}
