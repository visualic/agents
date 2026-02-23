// @TASK P1-S0-T1 - Card 테스트
import { render, screen, fireEvent } from '@testing-library/react'
import Card from './Card'

describe('Card', () => {
  it('children을 렌더링한다', () => {
    render(<Card><p>카드 내용</p></Card>)
    expect(screen.getByText('카드 내용')).toBeInTheDocument()
  })

  it('surface 배경 클래스를 가진다', () => {
    render(<Card><p>내용</p></Card>)
    const card = screen.getByText('내용').closest('[class]')
    expect(card).toHaveClass('bg-surface')
  })

  it('onClick이 있으면 클릭 핸들러가 호출된다', () => {
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}><p>클릭 카드</p></Card>)
    fireEvent.click(screen.getByText('클릭 카드'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('onClick이 있으면 cursor-pointer 클래스를 가진다', () => {
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}><p>클릭 카드</p></Card>)
    const card = screen.getByText('클릭 카드').closest('[class]')
    expect(card).toHaveClass('cursor-pointer')
  })

  it('onClick이 없으면 cursor-pointer 클래스가 없다', () => {
    render(<Card><p>일반 카드</p></Card>)
    const card = screen.getByText('일반 카드').closest('[class]')
    expect(card).not.toHaveClass('cursor-pointer')
  })

  it('className prop을 병합한다', () => {
    render(<Card className="custom-class"><p>내용</p></Card>)
    const card = screen.getByText('내용').closest('[class]')
    expect(card).toHaveClass('custom-class')
  })
})
