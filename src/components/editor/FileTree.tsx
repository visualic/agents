// @TASK P3-S2-T1 - FileTree Component
// @SPEC docs/planning/03-user-flow.md#preview
// @TEST src/pages/Preview.test.tsx

import type { WorkFile, FileType } from '../../types/work'

// ---------------------------------------------------------------------------
// File type icon mapping
// ---------------------------------------------------------------------------

function getFileIcon(fileType: FileType | null): string {
  if (fileType === 'config') return '⚙️'
  if (fileType === 'reference') return '📁'
  return '📄'
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FileTreeProps {
  files: WorkFile[]
  selectedFileId: number | null
  onSelect: (fileId: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FileTree({ files, selectedFileId, onSelect }: FileTreeProps): React.ReactElement {
  if (files.length === 0) {
    return (
      <div className="p-4 text-text-secondary text-sm">
        파일이 없습니다.
      </div>
    )
  }

  return (
    <nav aria-label="파일 목록" className="py-2">
      {files.map((file) => {
        const isSelected = file.id === selectedFileId
        const icon = getFileIcon(file.file_type)

        return (
          <button
            key={file.id}
            onClick={() => onSelect(file.id)}
            aria-current={isSelected ? 'true' : undefined}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors rounded-sm
              ${
                isSelected
                  ? 'bg-primary/20 text-text-primary'
                  : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
              }`}
          >
            <span aria-hidden="true">{icon}</span>
            <span className="truncate">{file.file_name}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default FileTree
