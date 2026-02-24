// @TASK P3-S1-T1 - Guide Chat Area Component
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { useEffect, useRef } from 'react'
import ChatBubble from './ChatBubble'
import type { ChatMessage } from '../../types/guide'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GuideChatProps {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingChunk?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GuideChat({ messages, isStreaming, streamingChunk = '' }: GuideChatProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming chunks
  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingChunk])

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      role="log"
      aria-label="대화 내용"
      aria-live="polite"
    >
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <p className="text-text-secondary text-sm">대화를 시작하세요.</p>
        </div>
      )}

      {messages.map((msg, index) => (
        <ChatBubble key={`${msg.role}-${index}-${msg.timestamp}`} message={msg} />
      ))}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex justify-start" aria-label="AI 응답 중">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">
            AI
          </div>
          <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-surface border border-elevated text-text-primary rounded-bl-sm">
            {streamingChunk ? (
              <span>{streamingChunk}</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

export default GuideChat
