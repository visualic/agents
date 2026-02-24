import { useEffect, useRef } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useDiscoveryStore } from '../../stores/discoveryStore'
import { ipc } from '../../lib/ipc'

function PipelinePanel(): React.ReactElement {
  const { pipelineRunning, pipelineLog, error, runPipeline, appendLog } = useDiscoveryStore()
  const logRef = useRef<HTMLPreElement>(null)

  // Listen for pipeline progress events.
  // Preload strips the IPC event, so callback receives (payload) directly.
  useEffect(() => {
    function handleProgress(...args: unknown[]) {
      const payload = args[0] as { type: string; data: string }
      if (payload?.data) appendLog(payload.data)
    }

    ipc.on('discovery:pipeline-progress', handleProgress)
    return () => {
      ipc.removeListener('discovery:pipeline-progress', handleProgress)
    }
  }, [appendLog])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [pipelineLog])

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-text-primary font-semibold text-base">
          파이프라인
        </h3>
        <Button
          onClick={runPipeline}
          disabled={pipelineRunning}
          size="sm"
        >
          {pipelineRunning ? '실행 중...' : '크롤링 실행'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded p-3 mb-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {(pipelineRunning || pipelineLog) && (
        <pre
          ref={logRef}
          className="bg-elevated rounded p-3 text-xs text-text-secondary font-mono max-h-48 overflow-auto"
        >
          {pipelineLog || '파이프라인 시작 중...'}
        </pre>
      )}
    </Card>
  )
}

export default PipelinePanel
