// @TASK P3-S1-T1 - Chat Bubble Component
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import type { ChatMessage } from '../../types/guide'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatBubbleProps {
  message: ChatMessage
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ChatBubble({ message }: ChatBubbleProps): React.ReactElement {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-text-secondary bg-elevated px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">
          AI
        </div>
      )}

      <div
        className={[
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-surface text-text-primary rounded-bl-sm border border-elevated',
        ].join(' ')}
        data-role={message.role}
      >
        {/* Render newlines as paragraphs */}
        {message.content.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>

      {/* User avatar placeholder */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-xs font-bold ml-2 mt-1">
          나
        </div>
      )}
    </div>
  )
}

export default ChatBubble
