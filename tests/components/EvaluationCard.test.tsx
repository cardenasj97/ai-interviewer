import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EvaluationCard from '@ui/components/EvaluationCard'
import type { Evaluation } from '@/types/domain'

function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    id: 'eval-1',
    sessionId: 'session-1',
    overallScore: 78,
    summary: 'Solid mid-level frontend candidate with strong React fundamentals.',
    strengths: ['Clean component design', 'Good testing instincts'],
    concerns: ['Shallow accessibility answers'],
    competencyScores: [
      { competency: 'React', score: 85, rationale: 'Explained reconciliation clearly.' },
      { competency: 'Accessibility', score: 45, rationale: 'Basic knowledge only.' },
    ],
    rawModelOutput: '{}',
    createdAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('EvaluationCard', () => {
  it('renders all basic fields', () => {
    render(<EvaluationCard evaluation={makeEvaluation()} />)
    expect(screen.getByText('78')).toBeInTheDocument()
    expect(screen.getByText(/Solid mid-level frontend candidate/i)).toBeInTheDocument()
    expect(screen.getByText('Clean component design')).toBeInTheDocument()
    expect(screen.getByText('Shallow accessibility answers')).toBeInTheDocument()
  })

  it('renders per-competency scores', () => {
    render(<EvaluationCard evaluation={makeEvaluation()} />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Explained reconciliation clearly.')).toBeInTheDocument()
  })

  it('renders "No significant concerns noted." when concerns is empty', () => {
    render(<EvaluationCard evaluation={makeEvaluation({ concerns: [] })} />)
    expect(screen.getByText('No significant concerns noted.')).toBeInTheDocument()
  })

  it('score 45 renders with red color class', () => {
    const { container } = render(<EvaluationCard evaluation={makeEvaluation({ overallScore: 45 })} />)
    const score = screen.getByLabelText(/Overall score: 45/i)
    expect(score.className).toContain('text-red-600')
  })

  it('score 70 renders with amber color class', () => {
    const { container } = render(<EvaluationCard evaluation={makeEvaluation({ overallScore: 70 })} />)
    const score = screen.getByLabelText(/Overall score: 70/i)
    expect(score.className).toContain('text-amber-600')
  })

  it('score 90 renders with green color class', () => {
    render(<EvaluationCard evaluation={makeEvaluation({ overallScore: 90 })} />)
    const score = screen.getByLabelText(/Overall score: 90/i)
    expect(score.className).toContain('text-green-600')
  })

  it('renders strengths with checkmark indicators', () => {
    render(<EvaluationCard evaluation={makeEvaluation()} />)
    expect(screen.getByText('Good testing instincts')).toBeInTheDocument()
  })
})
