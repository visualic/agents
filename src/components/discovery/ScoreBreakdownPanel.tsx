import ScoreBar from './ScoreBar'
import Card from '../ui/Card'
import type { QualityScores } from '../../types/artifact'

interface ScoreBreakdownPanelProps {
  scores: QualityScores
}

const SCORE_LABELS: Array<{ key: keyof QualityScores; label: string; max: number }> = [
  { key: 'relevance', label: '관련성', max: 20 },
  { key: 'reproducibility', label: '재현성', max: 15 },
  { key: 'maintenance', label: '유지보수', max: 15 },
  { key: 'structure', label: '구조', max: 15 },
  { key: 'evidence', label: '증거', max: 15 },
  { key: 'license_clarity', label: '라이선스', max: 10 },
  { key: 'risk_penalty', label: '리스크 감점', max: 30 }
]

function ScoreBreakdownPanel({ scores }: ScoreBreakdownPanelProps): React.ReactElement {
  return (
    <Card>
      <h3 className="text-text-primary font-semibold text-base mb-4">품질 점수 상세</h3>
      <div className="space-y-3">
        {SCORE_LABELS.map(({ key, label, max }) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">{label}</span>
              <span className="text-text-primary font-mono">
                {key === 'risk_penalty' ? `-${scores[key]}` : scores[key]}/{max}
              </span>
            </div>
            <ScoreBar
              score={key === 'risk_penalty' ? max - scores[key] : scores[key]}
              maxScore={max}
              showLabel={false}
              size="sm"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-elevated flex justify-between items-center">
        <span className="text-text-primary font-semibold">총점</span>
        <span className="text-2xl font-bold text-primary">{scores.total}</span>
      </div>
    </Card>
  )
}

export default ScoreBreakdownPanel
