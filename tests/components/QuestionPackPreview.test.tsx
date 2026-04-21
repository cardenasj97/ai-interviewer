import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuestionPackPreview from '@ui/components/QuestionPackPreview'
import type { QuestionPack } from '@ui/api/jobs'

function makeItem(
  id: string,
  prompt: string,
  order: number,
  category: 'behavioral' | 'technical' | 'system-design' | 'situational' = 'behavioral',
) {
  return { id, category, prompt, competency: 'general', order }
}

function makePack(count: number): QuestionPack {
  return Array.from({ length: count }, (_, i) =>
    makeItem(`q${i + 1}`, `Question ${i + 1}?`, i + 1),
  )
}

describe('QuestionPackPreview', () => {
  it('renders nothing when pack is null', () => {
    const { container } = render(<QuestionPackPreview pack={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when pack is undefined', () => {
    const { container } = render(<QuestionPackPreview pack={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when pack is empty', () => {
    const { container } = render(<QuestionPackPreview pack={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all question prompts when pack has ≤3 items', () => {
    const pack = makePack(3)
    render(<QuestionPackPreview pack={pack} />)
    expect(screen.getByText('Question 1?')).toBeInTheDocument()
    expect(screen.getByText('Question 2?')).toBeInTheDocument()
    expect(screen.getByText('Question 3?')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows heading text', () => {
    render(<QuestionPackPreview pack={makePack(1)} />)
    expect(screen.getByText(/topics you might be asked about/i)).toBeInTheDocument()
  })

  it('shows "Show all (N)" button when pack has >3 items', () => {
    render(<QuestionPackPreview pack={makePack(5)} />)
    expect(screen.getByRole('button', { name: /show all \(5\)/i })).toBeInTheDocument()
    expect(screen.queryByText('Question 4?')).toBeNull()
    expect(screen.queryByText('Question 5?')).toBeNull()
  })

  it('clicking "Show all" expands to all questions', () => {
    render(<QuestionPackPreview pack={makePack(5)} />)
    fireEvent.click(screen.getByRole('button', { name: /show all \(5\)/i }))
    expect(screen.getByText('Question 4?')).toBeInTheDocument()
    expect(screen.getByText('Question 5?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
  })

  it('clicking "Show less" collapses back to 3', () => {
    render(<QuestionPackPreview pack={makePack(5)} />)
    fireEvent.click(screen.getByRole('button', { name: /show all \(5\)/i }))
    fireEvent.click(screen.getByRole('button', { name: /show less/i }))
    expect(screen.queryByText('Question 4?')).toBeNull()
    expect(screen.getByRole('button', { name: /show all \(5\)/i })).toBeInTheDocument()
  })
})
