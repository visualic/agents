// @TASK P1-S0-T1 - Toast 테스트
import { render, screen, act } from '@testing-library/react'
import Toast from './Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('메시지를 렌더링한다', () => {
    const onClose = vi.fn()
    render(<Toast type="success" message="저장되었습니다" onClose={onClose} />)
    expect(screen.getByText('저장되었습니다')).toBeInTheDocument()
  })

  it('success 타입 스타일이 적용된다', () => {
    const onClose = vi.fn()
    render(<Toast type="success" message="성공" onClose={onClose} />)
    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-green-600')
  })

  it('error 타입 스타일이 적용된다', () => {
    const onClose = vi.fn()
    render(<Toast type="error" message="오류" onClose={onClose} />)
    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-red-600')
  })

  it('info 타입 스타일이 적용된다', () => {
    const onClose = vi.fn()
    render(<Toast type="info" message="정보" onClose={onClose} />)
    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('bg-blue-600')
  })

  it('3초 후에 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(<Toast type="success" message="성공" onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('role=alert 속성을 가진다', () => {
    const onClose = vi.fn()
    render(<Toast type="info" message="정보" onClose={onClose} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
