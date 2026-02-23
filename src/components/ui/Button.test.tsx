// @TASK P1-S0-T1 - Button 테스트
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('children 텍스트를 렌더링한다', () => {
    render(<Button>클릭하기</Button>)
    expect(screen.getByText('클릭하기')).toBeInTheDocument()
  })

  it('기본 variant는 primary다', () => {
    render(<Button>버튼</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-primary')
  })

  it('secondary variant 스타일이 적용된다', () => {
    render(<Button variant="secondary">버튼</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-elevated')
  })

  it('danger variant 스타일이 적용된다', () => {
    render(<Button variant="danger">버튼</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-red-600')
  })

  it('sm size 스타일이 적용된다', () => {
    render(<Button size="sm">버튼</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('px-3')
  })

  it('lg size 스타일이 적용된다', () => {
    render(<Button size="lg">버튼</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('px-6')
  })

  it('onClick 핸들러가 호출된다', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>버튼</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 상태에서 클릭이 동작하지 않는다', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>버튼</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('type prop이 전달된다', () => {
    render(<Button type="submit">버튼</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
