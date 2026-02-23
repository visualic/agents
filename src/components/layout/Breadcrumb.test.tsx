// @TASK P1-S0-T1 - Breadcrumb 테스트
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from './Breadcrumb'

describe('Breadcrumb', () => {
  it('단일 항목을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: '홈' }]} />
      </MemoryRouter>
    )
    expect(screen.getByText('홈')).toBeInTheDocument()
  })

  it('여러 항목을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '패턴 라이브러리', href: '/patterns' },
            { label: 'Python 스킬' },
          ]}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('패턴 라이브러리')).toBeInTheDocument()
    expect(screen.getByText('Python 스킬')).toBeInTheDocument()
  })

  it('href가 있는 항목은 링크로 렌더링된다', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '현재 페이지' },
          ]}
        />
      </MemoryRouter>
    )
    const homeLink = screen.getByText('홈').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('href가 없는 마지막 항목은 링크가 아니다', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '현재 페이지' },
          ]}
        />
      </MemoryRouter>
    )
    const lastItem = screen.getByText('현재 페이지')
    expect(lastItem.tagName.toLowerCase()).not.toBe('a')
  })

  it('항목 사이에 구분자가 렌더링된다', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            { label: '패턴' },
          ]}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('/')).toBeInTheDocument()
  })
})
