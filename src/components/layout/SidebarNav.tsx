// @TASK P1-S0-T1 - 사이드바 네비게이션 컴포넌트
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: '홈', href: '/' },
  { label: '패턴 라이브러리', href: '/patterns' },
  { label: '디스커버리', href: '/discover' },
  { label: '작업공간', href: '/workspace' },
] as const

function SidebarNav(): React.ReactElement {
  return (
    <nav className="bg-surface w-[240px] h-screen fixed top-0 left-0 flex flex-col border-r border-elevated">
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-elevated">
        <span className="text-lg font-bold text-text-primary font-mono tracking-tight">
          SkillForge
        </span>
      </div>

      {/* 메뉴 */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              [
                'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-elevated text-primary'
                  : 'text-text-secondary hover:bg-elevated/50 hover:text-text-primary',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}

        {/* 새로 만들기 버튼 */}
        <div className="mt-auto pt-4 border-t border-elevated">
          <NavLink
            to="/patterns/new"
            className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            새로 만들기
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default SidebarNav
