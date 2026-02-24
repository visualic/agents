import { useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface VerificationChecklistProps {
  onVerify: (notes?: string) => void
  onReject: (notes?: string) => void
  disabled?: boolean
}

const CHECKLIST_ITEMS = [
  'README 내용 확인',
  '라이선스 호환성 확인',
  '코드 품질 검토',
  '보안 리스크 확인',
  '실제 재현 가능 확인'
]

function VerificationChecklist({ onVerify, onReject, disabled }: VerificationChecklistProps): React.ReactElement {
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false))
  const [notes, setNotes] = useState('')

  const allChecked = checked.every(Boolean)

  function toggleCheck(index: number) {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  return (
    <Card>
      <h3 className="text-text-primary font-semibold text-base mb-4">검증 체크리스트</h3>
      <div className="space-y-2 mb-4">
        {CHECKLIST_ITEMS.map((item, i) => (
          <label key={item} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggleCheck(i)}
              disabled={disabled}
              className="rounded border-elevated"
            />
            <span className={`text-sm ${checked[i] ? 'text-text-primary' : 'text-text-secondary'}`}>
              {item}
            </span>
          </label>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-text-secondary text-xs mb-1">메모</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="검증 또는 거부 사유..."
          disabled={disabled}
          className="w-full bg-surface border border-elevated rounded-md px-3 py-2 text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary resize-none h-20"
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => onVerify(notes || undefined)}
          disabled={!allChecked || disabled}
        >
          검증 완료
        </Button>
        <Button
          variant="danger"
          onClick={() => onReject(notes || undefined)}
          disabled={disabled}
        >
          거부
        </Button>
      </div>
    </Card>
  )
}

export default VerificationChecklist
