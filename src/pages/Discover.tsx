import { useEffect, useRef, useState } from 'react'
import Breadcrumb from '../components/layout/Breadcrumb'
import Input from '../components/ui/Input'
import SetupPanel from '../components/discovery/SetupPanel'
import PipelinePanel from '../components/discovery/PipelinePanel'
import ArtifactGrid from '../components/discovery/ArtifactGrid'
import { useDiscoveryStore } from '../stores/discoveryStore'
import type { ArtifactType, ArtifactStatus } from '../types/artifact'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_TABS: Array<ArtifactType | 'all'> = ['all', 'skill', 'agent', 'orchestration', 'tooling', 'reference']
const TYPE_LABELS: Record<string, string> = {
  all: '전체',
  skill: '스킬',
  agent: '에이전트',
  orchestration: '오케스트레이션',
  tooling: '도구',
  reference: '참조'
}

const STATUS_CHIPS: Array<ArtifactStatus | 'all'> = ['all', 'curated', 'review', 'verified', 'promoted', 'rejected']
const STATUS_LABELS: Record<string, string> = {
  all: '전체',
  curated: '수집됨',
  review: '검토중',
  verified: '검증됨',
  promoted: '승격됨',
  rejected: '거부됨'
}

// ---------------------------------------------------------------------------
// Discover Page
// ---------------------------------------------------------------------------

function Discover(): React.ReactElement {
  const {
    artifacts, runs, config, filter, loading, error,
    loadConfig, checkSetup, fetchRuns, fetchArtifacts, setFilter, importRun
  } = useDiscoveryStore()

  const [searchValue, setSearchValue] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [selectedRun, setSelectedRun] = useState<string>('')
  const [importRunId, setImportRunId] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scoreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Init on mount
  useEffect(() => {
    loadConfig()
    checkSetup()
    fetchRuns()
    fetchArtifacts()
  }, [loadConfig, checkSetup, fetchRuns, fetchArtifacts])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (scoreDebounceRef.current) clearTimeout(scoreDebounceRef.current)
    }
  }, [])

  // Search debounce
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilter({ search: value || undefined })
    }, 300)
  }

  function handleMinScoreChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value)
    setMinScore(val)
    if (scoreDebounceRef.current) clearTimeout(scoreDebounceRef.current)
    scoreDebounceRef.current = setTimeout(() => {
      setFilter({ min_score: val > 0 ? val : undefined })
    }, 300)
  }

  function handleRunSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const runId = e.target.value
    setSelectedRun(runId)
    setFilter({ run_id: runId || undefined })
  }

  async function handleImportRun() {
    if (!importRunId.trim()) return
    await importRun(importRunId.trim())
    setImportRunId('')
  }

  // No config → show setup
  if (!config) {
    return (
      <div className="p-6 space-y-6">
        <Breadcrumb items={[{ label: '홈', href: '/' }, { label: '디스커버리' }]} />
        <div>
          <h1 className="text-text-primary text-2xl font-bold">디스커버리</h1>
          <p className="text-text-secondary text-sm mt-1">
            agents-casting 파이프라인으로 GitHub 패턴을 탐색합니다.
          </p>
        </div>
        <SetupPanel />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: '홈', href: '/' }, { label: '디스커버리' }]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">디스커버리</h1>
          <p className="text-text-secondary text-sm mt-1">
            agents-casting 파이프라인으로 GitHub 패턴을 탐색합니다.
          </p>
        </div>
        <SetupPanel />
      </div>

      {/* Pipeline */}
      <PipelinePanel />

      {/* Manual import */}
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-text-secondary text-xs mb-1">기존 Run 임포트</label>
          <Input
            placeholder="run-id"
            value={importRunId}
            onChange={(e) => setImportRunId(e.target.value)}
            className="w-48"
          />
        </div>
        <button
          onClick={handleImportRun}
          disabled={!importRunId.trim()}
          className="px-3 py-2 text-sm bg-elevated text-text-primary rounded-md hover:bg-elevated/80 disabled:opacity-50"
        >
          임포트
        </button>
      </div>

      {/* Run selector */}
      {runs.length > 0 && (
        <div>
          <label className="block text-text-secondary text-xs mb-1">Run 선택</label>
          <select
            value={selectedRun}
            onChange={handleRunSelect}
            className="bg-surface border border-elevated rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
          >
            <option value="">전체 Run</option>
            {runs.map((runId) => (
              <option key={runId} value={runId}>{runId}</option>
            ))}
          </select>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="아티팩트 검색..."
        value={searchValue}
        onChange={handleSearchChange}
        className="w-full max-w-md"
        aria-label="아티팩트 검색"
      />

      {/* Type filter tabs */}
      <div role="tablist" className="flex gap-1 bg-surface border border-elevated rounded-lg p-1 flex-wrap">
        {TYPE_TABS.map((tab) => {
          const isActive = tab === 'all' ? !filter.artifact_type : filter.artifact_type === tab
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter({ artifact_type: tab === 'all' ? undefined : tab })}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`}
            >
              {TYPE_LABELS[tab]}
            </button>
          )
        })}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const isActive = chip === 'all' ? !filter.status : filter.status === chip
          return (
            <button
              key={chip}
              onClick={() => setFilter({ status: chip === 'all' ? undefined : chip })}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'bg-primary border-primary text-white'
                  : 'bg-surface border-elevated text-text-secondary hover:border-primary/50'
              }`}
            >
              {STATUS_LABELS[chip]}
            </button>
          )
        })}
      </div>

      {/* Score slider */}
      <div className="flex items-center gap-3">
        <label className="text-text-secondary text-sm">최소 점수:</label>
        <input
          type="range"
          min={0}
          max={100}
          value={minScore}
          onChange={handleMinScoreChange}
          className="w-48"
        />
        <span className="text-text-primary text-sm font-mono w-8">{minScore}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-text-secondary">불러오는 중...</p>
        </div>
      ) : (
        <ArtifactGrid artifacts={artifacts} />
      )}
    </div>
  )
}

export default Discover
