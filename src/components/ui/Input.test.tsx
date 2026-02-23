// @TASK P1-S0-T1 - Input 테스트
import { render, screen, fireEvent } from '@testing-library/react'
import Input from './Input'

describe('Input', () => {
  it('기본 input 요소를 렌더링한다', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('placeholder가 적용된다', () => {
    render(<Input placeholder="검색어를 입력하세요" />)
    expect(screen.getByPlaceholderText('검색어를 입력하세요')).toBeInTheDocument()
  })

  it('value 변경 이벤트가 동작한다', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '테스트' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('surface 배경 클래스를 가진다', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toHaveClass('bg-surface')
  })

  it('disabled 상태가 적용된다', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('className prop을 병합한다', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('type prop이 전달된다', () => {
    render(<Input type="password" />)
    const input = document.querySelector('input[type="password"]')
    expect(input).toBeInTheDocument()
  })
})
