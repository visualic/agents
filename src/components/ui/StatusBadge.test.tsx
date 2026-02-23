// @TASK P1-S0-T1 - StatusBadge 테스트
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('draft 상태 레이블을 렌더링한다', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('초안')).toBeInTheDocument()
  })

  it('completed 상태 레이블을 렌더링한다', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('exported 상태 레이블을 렌더링한다', () => {
    render(<StatusBadge status="exported" />)
    expect(screen.getByText('내보냄')).toBeInTheDocument()
  })

  it('draft 상태에 회색 스타일이 적용된다', () => {
    render(<StatusBadge status="draft" />)
    const badge = screen.getByText('초안')
    expect(badge).toHaveClass('bg-elevated')
  })

  it('completed 상태에 녹색 스타일이 적용된다', () => {
    render(<StatusBadge status="completed" />)
    const badge = screen.getByText('완료')
    expect(badge).toHaveClass('bg-green-600')
  })

  it('exported 상태에 파란색 스타일이 적용된다', () => {
    render(<StatusBadge status="exported" />)
    const badge = screen.getByText('내보냄')
    expect(badge).toHaveClass('bg-blue-600')
  })
})
