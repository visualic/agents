// @TASK P4-S1-T1 - Workspace Page
// @SPEC docs/planning/03-user-flow.md#workspace
// @TEST src/pages/Workspace.test.tsx

import { useEffect, useRef, useState } from 'react'
import Breadcrumb from '../components/layout/Breadcrumb'
import Input from '../components/ui/Input'
import WorkGrid from '../components/workspace/WorkGrid'
import { useWorkStore, STATUS_LABELS, TYPE_LABELS } from '../stores/workStore'
import type { WorkStatus, WorkType } from '../types/work'

// ---------------------------------------------------------------------------
// Tab ordering
// ---------------------------------------------------------------------------

const STATUS_TABS: Array<WorkStatus | 'all'> = ['all', 'draft', 'completed', 'exported']
const TYPE_TABS: Array<WorkType | 'all'> = ['all', 'skill', 'agent', 'orchestration']

// ---------------------------------------------------------------------------
// StatusFilterTabs
// ---------------------------------------------------------------------------

interface StatusFilterTabsProps {
  activeStatus: WorkStatus | undefined
  onSelect: (status: WorkStatus | undefined) => void
}

function StatusFilterTabs({ activeStatus, onSelect }: StatusFilterTabsProps): React.ReactElement {
  return (
    <div role="tablist" className="flex gap-1 bg-surface border border-elevated rounded-lg p-1">
      {STATUS_TABS.map((tab) => {
        const isActive = tab === 'all' ? !activeStatus : activeStatus === tab
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab === 'all' ? undefined : (tab as WorkStatus))}
            className={`
              px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${isActive
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }
            `}
          >
            {STATUS_LABELS[tab]}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TypeFilterTabs
// ---------------------------------------------------------------------------

interface TypeFilterTabsProps {
  activeType: WorkType | undefined
  onSelect: (type: WorkType | undefined) => void
}

function TypeFilterTabs({ activeType, onSelect }: TypeFilterTabsProps): React.ReactElement {
  return (
    <div role="tablist" className="flex gap-1 bg-surface border border-elevated rounded-lg p-1">
      {TYPE_TABS.map((tab) => {
        const isActive = tab === 'all' ? !activeType : activeType === tab
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab === 'all' ? undefined : (tab as WorkType))}
            className={`
              px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${isActive
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }
            `}
          >
            {TYPE_LABELS[tab]}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Workspace Page
// ---------------------------------------------------------------------------

function Workspace(): React.ReactElement {
  const { works, loading, error, filter, fetchWorks, setFilter } = useWorkStore()

  const [searchValue, setSearchValue] = useState(filter.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch on mount
  useEffect(() => {
    fetchWorks()
  }, [fetchWorks])

  // Handle search with debounce
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilter({ search: value || undefined })
    }, 300)
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '내 작업실' },
        ]}
      />

      {/* Page title */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold">내 작업실</h1>
        <p className="text-text-secondary text-sm mt-1">
          내가 만든 스킬·에이전트·오케스트레이션 작업물을 관리합니다.
        </p>
      </div>

      {/* Search */}
      <Input
        placeholder="작업물 이름 검색..."
        value={searchValue}
        onChange={handleSearchChange}
        className="w-full max-w-md"
        aria-label="작업물 검색"
      />

      {/* Status filter tabs */}
      <StatusFilterTabs
        activeStatus={filter.status}
        onSelect={(status) => setFilter({ status })}
      />

      {/* Type filter tabs */}
      <TypeFilterTabs
        activeType={filter.type}
        onSelect={(type) => setFilter({ type })}
      />

      {/* Work grid */}
      <WorkGrid works={works} />
    </div>
  )
}

export default Workspace
