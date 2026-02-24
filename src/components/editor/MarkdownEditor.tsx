// @TASK P3-S2-T1 - MarkdownEditor Component
// @SPEC docs/planning/03-user-flow.md#preview
// @TEST src/pages/Preview.test.tsx

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  fileId: number | null
  content: string
  originalContent: string
  onChange: (fileId: number, content: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MarkdownEditor({
  fileId,
  content,
  originalContent,
  onChange,
}: MarkdownEditorProps): React.ReactElement {
  const isDisabled = fileId === null
  const isDirty = fileId !== null && content !== originalContent

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (fileId === null) return
    onChange(fileId, e.target.value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-elevated">
        <span className="text-xs text-text-secondary font-mono">
          {isDisabled ? '파일 없음' : '편집기'}
        </span>
        {isDirty && (
          <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
            수정됨
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={handleChange}
        disabled={isDisabled}
        placeholder={isDisabled ? '파일을 선택하세요.' : '내용을 입력하세요...'}
        aria-label="파일 내용 편집기"
        className="flex-1 w-full resize-none bg-transparent text-text-primary font-mono text-sm p-3 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
        spellCheck={false}
      />
    </div>
  )
}

export default MarkdownEditor
