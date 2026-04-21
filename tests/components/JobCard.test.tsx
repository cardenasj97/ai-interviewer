import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import JobCard from '@ui/components/JobCard'
import type { JobListItem } from '@/types/domain'

// @testing-library/user-event is not in devDeps, so use fireEvent instead
import { fireEvent } from '@testing-library/react'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function makeJob(overrides: Partial<JobListItem> = {}): JobListItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    shortDescription: 'Build delightful UIs with React and TypeScript.',
    level: 'mid',
    ...overrides,
  }
}

function renderCard(job: JobListItem) {
  return render(
    <MemoryRouter>
      <JobCard job={job} />
    </MemoryRouter>,
  )
}

describe('JobCard', () => {
  it('renders title, level, and short description', () => {
    renderCard(makeJob())
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('mid')).toBeInTheDocument()
    expect(screen.getByText('Build delightful UIs with React and TypeScript.')).toBeInTheDocument()
  })

  it('navigates to /interview/:slug on click', () => {
    renderCard(makeJob({ slug: 'frontend-engineer' }))
    fireEvent.click(screen.getByRole('button', { name: /Start interview for Frontend Engineer/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/interview/frontend-engineer')
  })

  it('navigates on Enter key press', () => {
    renderCard(makeJob({ slug: 'backend-engineer' }))
    const card = screen.getByRole('button')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(mockNavigate).toHaveBeenCalledWith('/interview/backend-engineer')
  })

  it('applies level-specific badge for each level', () => {
    const levels = ['junior', 'mid', 'senior', 'staff'] as const
    for (const level of levels) {
      const { unmount } = renderCard(makeJob({ level }))
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    }
  })
})
