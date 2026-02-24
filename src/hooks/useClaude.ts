// @TASK P3-S1-T1 - Claude CLI Streaming Hook
// @SPEC docs/planning/03-user-flow.md#guide-dialogue

import { useState, useEffect, useCallback, useRef } from 'react'
import { ipc } from '../lib/ipc'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseClaudeReturn {
  sendMessage: (message: string, systemPrompt?: string) => Promise<string>
  abort: () => void
  isStreaming: boolean
  currentChunk: string
  error: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useClaude(): UseClaudeReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentChunk, setCurrentChunk] = useState('')
  const [error, setError] = useState<string | null>(null)
  const accumulatedRef = useRef('')
  const abortedRef = useRef(false)

  // Register streaming event listeners on mount, clean up on unmount
  useEffect(() => {
    const handleChunk = (...args: unknown[]) => {
      const chunk = args[0] as string
      accumulatedRef.current += chunk
      setCurrentChunk((prev) => prev + chunk)
    }

    const handleError = (...args: unknown[]) => {
      const errMsg = args[0] as string
      setError(errMsg)
      setIsStreaming(false)
    }

    ipc.on('claude:stream-chunk', handleChunk)
    ipc.on('claude:stream-error', handleError)

    return () => {
      ipc.removeListener('claude:stream-chunk', handleChunk)
      ipc.removeListener('claude:stream-error', handleError)
    }
  }, [])

  const sendMessage = useCallback(
    async (message: string, systemPrompt?: string): Promise<string> => {
      setIsStreaming(true)
      setCurrentChunk('')
      setError(null)
      accumulatedRef.current = ''
      abortedRef.current = false

      try {
        const response = await ipc.invoke<string>(
          'claude:send-message',
          message,
          systemPrompt
        )
        setIsStreaming(false)
        return response ?? accumulatedRef.current
      } catch (err) {
        if (!abortedRef.current) {
          const errMsg = err instanceof Error ? err.message : '메시지 전송 실패'
          setError(errMsg)
        }
        setIsStreaming(false)
        return accumulatedRef.current
      }
    },
    []
  )

  const abort = useCallback(() => {
    abortedRef.current = true
    setIsStreaming(false)
    ipc.invoke('claude:abort').catch(() => {
      // Ignore abort errors
    })
  }, [])

  return { sendMessage, abort, isStreaming, currentChunk, error }
}
