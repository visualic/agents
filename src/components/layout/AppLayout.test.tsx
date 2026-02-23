// @TASK P1-S0-T1 - AppLayout 테스트
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

describe('AppLayout', () => {
  it('사이드바와 메인 콘텐츠 영역을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <div data-testid="main-content">메인 콘텐츠</div>
        </AppLayout>
      </MemoryRouter>
    )
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })

  it('사이드바 nav 요소가 존재한다', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <div>콘텐츠</div>
        </AppLayout>
      </MemoryRouter>
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('children을 메인 영역에 렌더링한다', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <span data-testid="child">자식 요소</span>
        </AppLayout>
      </MemoryRouter>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toHaveTextContent('자식 요소')
  })
})
