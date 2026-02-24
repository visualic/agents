// @TASK P3-S2-T1 - Preview Zustand Store
// @SPEC docs/planning/03-user-flow.md#preview
// @TEST src/pages/Preview.test.tsx

import { create } from 'zustand'
import { ipc } from '../lib/ipc'
import type { Work, WorkFile } from '../types/work'

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface PreviewState {
  work: Work | null
  files: WorkFile[]
  selectedFileId: number | null
  fileContents: Record<number, string>       // fileId -> original content
  editedContents: Record<number, string>     // fileId -> edited content (dirty state)
  exportPath: string
  claudeDir: string | null
  loading: boolean
  exporting: boolean
  error: string | null
  // Actions
  initPreview: (workId: number) => Promise<void>
  selectFile: (fileId: number) => Promise<void>
  updateContent: (fileId: number, content: string) => void
  browseDirectory: () => Promise<void>
  exportFiles: () => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

// ---------------------------------------------------------------------------
// Helper: build default export path
// ---------------------------------------------------------------------------

function buildDefaultExportPath(work: Work, claudeDir: string | null): string {
  const base = claudeDir ?? '~/.claude'
  const subDir =
    work.type === 'skill'
      ? 'skills'
      : work.type === 'agent'
      ? 'agents'
      : 'commands'
  return `${base}/${subDir}/${work.name}`
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePreviewStore = create<PreviewState>((set, get) => ({
  work: null,
  files: [],
  selectedFileId: null,
  fileContents: {},
  editedContents: {},
  exportPath: '',
  claudeDir: null,
  loading: false,
  exporting: false,
  error: null,

  reset: () => {
    set({
      work: null,
      files: [],
      selectedFileId: null,
      fileContents: {},
      editedContents: {},
      exportPath: '',
      claudeDir: null,
      loading: false,
      exporting: false,
      error: null,
    })
  },

  initPreview: async (workId: number) => {
    set({ loading: true, error: null })
    try {
      const [work, files, claudeDir] = await Promise.all([
        ipc.invoke<Work>('work:get-by-id', workId),
        ipc.invoke<WorkFile[]>('work-file:get-by-work-id', workId),
        ipc.invoke<string | null>('file:detect-claude-dir'),
      ])

      if (!work) {
        set({ loading: false, error: '작업을 찾을 수 없습니다.' })
        return
      }

      const exportPath = buildDefaultExportPath(work, claudeDir ?? null)

      set({
        work,
        files: files ?? [],
        claudeDir: claudeDir ?? null,
        exportPath,
        loading: false,
      })

      // Auto-select first file
      const fileList = files ?? []
      if (fileList.length > 0) {
        await get().selectFile(fileList[0].id)
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '미리보기를 초기화하지 못했습니다.',
        loading: false,
      })
    }
  },

  selectFile: async (fileId: number) => {
    const { fileContents } = get()

    set({ selectedFileId: fileId })

    // Skip if already loaded
    if (fileContents[fileId] !== undefined) return

    const { files } = get()
    const file = files.find((f) => f.id === fileId)
    if (!file) return

    try {
      const result = await ipc.invoke<{ success: boolean; content?: string; error?: string }>(
        'work-file:read-content',
        file.file_path
      )
      const content = result?.success ? (result.content ?? '') : ''
      set((state) => ({
        fileContents: { ...state.fileContents, [fileId]: content },
      }))
    } catch {
      set((state) => ({
        fileContents: { ...state.fileContents, [fileId]: '' },
      }))
    }
  },

  updateContent: (fileId: number, content: string) => {
    const { fileContents } = get()
    const original = fileContents[fileId] ?? ''
    set((state) => {
      const next = { ...state.editedContents }
      if (content === original) {
        delete next[fileId]
      } else {
        next[fileId] = content
      }
      return { editedContents: next }
    })
  },

  browseDirectory: async () => {
    const result = await ipc.invoke<{ canceled: boolean; filePaths: string[] }>(
      'file:browse-directory'
    )
    if (!result.canceled && result.filePaths.length > 0) {
      set({ exportPath: result.filePaths[0] })
    }
  },

  exportFiles: async () => {
    const { work, files, fileContents, editedContents, exportPath } = get()
    if (!work) return { success: false, error: '작업을 찾을 수 없습니다.' }

    set({ exporting: true, error: null })

    try {
      // Export each file
      for (const file of files) {
        const content = editedContents[file.id] ?? fileContents[file.id] ?? ''
        const fullPath = `${exportPath}/${file.file_path}`
        const result = await ipc.invoke<{ success: boolean; error?: string }>(
          'file:export',
          fullPath,
          content
        )
        if (!result?.success) {
          const errorMsg = result?.error ?? '내보내기 실패'
          set({ exporting: false, error: errorMsg })
          return { success: false, error: errorMsg }
        }
      }

      // Update work status
      await ipc.invoke('work:update', work.id, {
        status: 'exported',
        export_path: exportPath,
      })

      set({ exporting: false })
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '내보내기 실패'
      set({ exporting: false, error: errorMsg })
      return { success: false, error: errorMsg }
    }
  },
}))
