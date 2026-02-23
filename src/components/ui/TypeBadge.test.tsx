// @TASK P1-S0-T1 - TypeBadge 테스트
import { render, screen } from '@testing-library/react'
import TypeBadge from './TypeBadge'

describe('TypeBadge', () => {
  it('skill 타입 레이블을 렌더링한다', () => {
    render(<TypeBadge type="skill" />)
    expect(screen.getByText('스킬')).toBeInTheDocument()
  })

  it('agent 타입 레이블을 렌더링한다', () => {
    render(<TypeBadge type="agent" />)
    expect(screen.getByText('에이전트')).toBeInTheDocument()
  })

  it('orchestration 타입 레이블을 렌더링한다', () => {
    render(<TypeBadge type="orchestration" />)
    expect(screen.getByText('오케스트레이션')).toBeInTheDocument()
  })

  it('skill 타입에 보라색 스타일이 적용된다', () => {
    render(<TypeBadge type="skill" />)
    const badge = screen.getByText('스킬')
    expect(badge).toHaveClass('bg-skill')
  })

  it('agent 타입에 시안 스타일이 적용된다', () => {
    render(<TypeBadge type="agent" />)
    const badge = screen.getByText('에이전트')
    expect(badge).toHaveClass('bg-agent')
  })

  it('orchestration 타입에 오렌지 스타일이 적용된다', () => {
    render(<TypeBadge type="orchestration" />)
    const badge = screen.getByText('오케스트레이션')
    expect(badge).toHaveClass('bg-orchestration')
  })
})
