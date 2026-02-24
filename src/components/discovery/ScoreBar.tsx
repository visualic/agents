interface ScoreBarProps {
  score: number
  maxScore?: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

function getScoreColor(score: number, max: number): string {
  const ratio = score / Math.max(max, 1)
  if (ratio >= 0.7) return 'bg-green-500'
  if (ratio >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function ScoreBar({ score, maxScore = 100, showLabel = true, size = 'md' }: ScoreBarProps): React.ReactElement {
  const pct = Math.min(100, Math.max(0, (score / Math.max(maxScore, 1)) * 100))
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-elevated rounded-full ${barHeight} overflow-hidden`}>
        <div
          className={`${barHeight} rounded-full transition-all ${getScoreColor(score, maxScore)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-secondary font-mono w-8 text-right">
          {score}
        </span>
      )}
    </div>
  )
}

export default ScoreBar
