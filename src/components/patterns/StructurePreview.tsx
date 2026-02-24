// @TASK P2-S3-T1 - Structure Preview Component
// @SPEC docs/planning/03-user-flow.md#pattern-detail
// @TEST src/pages/PatternDetail.test.tsx

interface StructurePreviewProps {
  content: string
}

function StructurePreview({ content }: StructurePreviewProps): React.ReactElement {
  return (
    <div className="bg-elevated rounded-lg p-4">
      <h2 className="text-text-primary text-sm font-semibold mb-3">구조 미리보기</h2>
      <pre className="text-text-secondary text-xs font-mono leading-relaxed overflow-auto whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  )
}

export default StructurePreview
