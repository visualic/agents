// @TASK P2-S3-T1 - Code Viewer Component
// @SPEC docs/planning/03-user-flow.md#pattern-detail
// @TEST src/pages/PatternDetail.test.tsx

interface CodeViewerProps {
  content: string
  filePath?: string
}

function CodeViewer({ content, filePath }: CodeViewerProps): React.ReactElement {
  const lines = content.split('\n')

  return (
    <div className="bg-elevated rounded-lg overflow-hidden">
      {filePath && (
        <div className="px-4 py-2 border-b border-surface flex items-center gap-2">
          <span className="text-text-secondary text-xs font-mono">{filePath}</span>
        </div>
      )}
      <div className="overflow-auto max-h-96">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-surface/50">
                <td className="text-text-secondary select-none px-3 py-0.5 text-right w-12 border-r border-surface/50">
                  {index + 1}
                </td>
                <td className="text-text-primary px-3 py-0.5 whitespace-pre">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CodeViewer
