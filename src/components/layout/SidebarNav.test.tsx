// @TASK P1-S0-T1 - SidebarNav 테스트
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SidebarNav from './SidebarNav'

describe('SidebarNav', () => {
  it('로고 텍스트를 렌더링한다', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>
    )
    expect(screen.getByText('SkillForge')).toBeInTheDocument()
  })

  it('4개의 네비게이션 링크를 렌더링한다', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>
    )
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
    expect(screen.getByText('작업공간')).toBeInTheDocument()
    expect(screen.getByText('새로 만들기')).toBeInTheDocument()
  })

  it('홈 링크가 / 경로를 가진다', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>
    )
    const homeLink = screen.getByText('홈').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('패턴 라이브러리 링크가 /patterns 경로를 가진다', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>
    )
    const patternsLink = screen.getByText('패턴 라이브러리').closest('a')
    expect(patternsLink).toHaveAttribute('href', '/patterns')
  })

  it('작업공간 링크가 /workspace 경로를 가진다', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>
    )
    const workspaceLink = screen.getByText('작업공간').closest('a')
    expect(workspaceLink).toHaveAttribute('href', '/workspace')
  })

  it('현재 경로에 해당하는 링크에 활성 스타일이 적용된다', () => {
    render(
      <MemoryRouter initialEntries={['/patterns']}>
        <SidebarNav />
      </MemoryRouter>
    )
    const patternsLink = screen.getByText('패턴 라이브러리').closest('a')
    expect(patternsLink).toHaveClass('bg-elevated')
  })
})
