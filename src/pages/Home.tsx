// @TASK P2-S1-T1 - Home Screen
// @SPEC docs/planning/03-user-flow.md#home-screen
// @TEST src/pages/Home.test.tsx

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import TypeBadge from '../components/ui/TypeBadge'
import StatusBadge from '../components/ui/StatusBadge'
import { useStatsStore } from '../stores/statsStore'
import type { RecentWork } from '../stores/statsStore'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps): React.ReactElement {
  return (
    <Card>
      <p className="text-text-secondary text-sm mb-1">{label}</p>
      <p className="text-text-primary text-3xl font-bold">{value}</p>
    </Card>
  )
}

interface MenuCardProps {
  to: string
  title: string
  description: string
  icon: string
}

function MenuCard({ to, title, description, icon }: MenuCardProps): React.ReactElement {
  return (
    <Link to={to} className="block">
      <Card className="h-full hover:bg-elevated transition-colors">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-text-primary font-semibold text-base">{title}</h3>
            <p className="text-text-secondary text-sm mt-1">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  )
}

interface RecentWorkItemProps {
  work: RecentWork
}

function RecentWorkItem({ work }: RecentWorkItemProps): React.ReactElement {
  const date = new Date(work.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <Link to={`/workspace/${work.id}`} className="block">
      <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-elevated transition-colors cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <TypeBadge type={work.type} />
          <span className="text-text-primary text-sm font-medium truncate">{work.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <StatusBadge status={work.status} />
          <span className="text-text-secondary text-xs">{date}</span>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

function Home(): React.ReactElement {
  const { stats, loading, error, fetchStats } = useStatsStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary">불러오는 중...</p>
      </div>
    )
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const recentWorks = stats?.recent_works ?? []

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold">홈</h1>
        <p className="text-text-secondary text-sm mt-1">
          SkillForge - Claude Code 패턴 도구
        </p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <section aria-label="통계">
          <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
            통계
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="전체 패턴" value={stats.total_patterns} />
            <StatCard label="내 작업" value={stats.total_works} />
            <StatCard label="아티팩트" value={stats.total_artifacts} />
          </div>
        </section>
      )}

      {/* Menu Cards */}
      <section aria-label="메뉴">
        <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
          바로가기
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MenuCard
            to="/patterns"
            title="패턴 라이브러리"
            description="스킬·에이전트·오케스트레이션 패턴 탐색"
            icon="📚"
          />
          <MenuCard
            to="/workspace"
            title="내 작업실"
            description="작업 목록과 진행 상황 관리"
            icon="🗂️"
          />
          <MenuCard
            to="/discover"
            title="디스커버리"
            description="GitHub 패턴을 탐색하고 승격"
            icon="🔍"
          />
          <MenuCard
            to="/guide/new"
            title="새로 만들기"
            description="패턴을 선택하고 새 작업 시작"
            icon="✨"
          />
        </div>
      </section>

      {/* Recent Works */}
      <section aria-label="최근 작업">
        <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
          최근 작업
        </h2>
        {recentWorks.length === 0 ? (
          <div className="bg-surface border border-elevated rounded-lg p-6 text-center">
            <p className="text-text-secondary text-sm">아직 작업이 없습니다.</p>
            <Link to="/guide/new" className="text-primary text-sm mt-2 inline-block hover:underline">
              첫 작업 만들기
            </Link>
          </div>
        ) : (
          <div className="bg-surface border border-elevated rounded-lg divide-y divide-elevated">
            {recentWorks.map((work) => (
              <RecentWorkItem key={work.id} work={work} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
