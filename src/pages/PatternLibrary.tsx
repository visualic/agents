// @TASK P2-S2-T1 - Pattern Library Page
// @SPEC docs/planning/03-user-flow.md#pattern-library
// @TEST src/pages/PatternLibrary.test.tsx

import { useEffect, useRef, useState } from 'react'
import Breadcrumb from '../components/layout/Breadcrumb'
import Input from '../components/ui/Input'
import PatternGrid from '../components/patterns/PatternGrid'
import { usePatternStore, TYPE_LABELS } from '../stores/patternStore'
import type { PatternType } from '../types/pattern'

// ---------------------------------------------------------------------------
// Type filter tab order
// ---------------------------------------------------------------------------

const TYPE_TABS: Array<PatternType | 'all'> = ['all', 'skill', 'agent', 'orchestration']

// ---------------------------------------------------------------------------
// TypeFilterTabs
// ---------------------------------------------------------------------------

interface TypeFilterTabsProps {
  activeType: PatternType | undefined
  onSelect: (type: PatternType | undefined) => void
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
            onClick={() => onSelect(tab === 'all' ? undefined : (tab as PatternType))}
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
// TagFilterChips
// ---------------------------------------------------------------------------

interface TagFilterChipsProps {
  tags: Array<{ id: number; name: string; category: string | null }>
  activeTagId: number | undefined
  onSelect: (tagId: number | undefined) => void
}

function TagFilterChips({ tags, activeTagId, onSelect }: TagFilterChipsProps): React.ReactElement {
  if (tags.length === 0) return <></>

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isActive = activeTagId === tag.id
        return (
          <button
            key={tag.id}
            onClick={() => onSelect(isActive ? undefined : tag.id)}
            className={`
              text-xs px-3 py-1 rounded-full border transition-colors
              ${isActive
                ? 'bg-primary border-primary text-white'
                : 'bg-surface border-elevated text-text-secondary hover:border-primary/50 hover:text-text-primary'
              }
            `}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PatternLibrary Page
// ---------------------------------------------------------------------------

function PatternLibrary(): React.ReactElement {
  const { patterns, tags, loading, error, filter, fetchPatterns, fetchTags, setFilter } =
    usePatternStore()

  const [searchValue, setSearchValue] = useState(filter.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch on mount
  useEffect(() => {
    fetchPatterns()
    fetchTags()
  }, [fetchPatterns, fetchTags])

  // Handle search with debounce
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilter({ search: value || undefined })
    }, 300)
  }

  // Derive active tag id from filter (tags is string[] in PatternFilter but we store single id)
  const activeTagId = filter.tags && filter.tags.length > 0 ? Number(filter.tags[0]) : undefined

  function handleTagSelect(tagId: number | undefined) {
    setFilter({ tags: tagId !== undefined ? [String(tagId)] : [] })
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
          { label: '패턴 라이브러리' },
        ]}
      />

      {/* Page title */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold">패턴 라이브러리</h1>
        <p className="text-text-secondary text-sm mt-1">
          스킬·에이전트·오케스트레이션 패턴을 탐색합니다.
        </p>
      </div>

      {/* Search */}
      <Input
        placeholder="패턴 이름 또는 설명 검색..."
        value={searchValue}
        onChange={handleSearchChange}
        className="w-full max-w-md"
        aria-label="패턴 검색"
      />

      {/* Type filter tabs */}
      <TypeFilterTabs
        activeType={filter.type}
        onSelect={(type) => setFilter({ type })}
      />

      {/* Tag filter chips */}
      <TagFilterChips
        tags={tags}
        activeTagId={activeTagId}
        onSelect={handleTagSelect}
      />

      {/* Pattern grid */}
      <PatternGrid patterns={patterns} />
    </div>
  )
}

export default PatternLibrary
