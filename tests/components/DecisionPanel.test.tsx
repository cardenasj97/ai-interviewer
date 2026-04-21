import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DecisionPanel from '@ui/components/DecisionPanel'
import type { DecisionSignal } from '@/types/domain'

function makeSignal(overrides: Partial<DecisionSignal> = {}): DecisionSignal {
  return {
    id: 'signal-1',
    sessionId: 'session-1',
    afterTurnIndex: 2,
    competencies: [
      { competency: 'React', level: 'strong', evidence: null },
      { competency: 'Testing', level: 'weak', evidence: null },
      { competency: 'CSS', level: 'not_observed', evidence: null },
      { competency: 'TypeScript', level: 'adequate', evidence: null },
    ],
    topicsCovered: ['hooks', 'state management'],
    gaps: ['accessibility', 'performance'],
    nextQuestionRationale: 'Candidate showed strong React skills; testing needs improvement.',
    nextQuestionKind: 'follow_up',
    createdAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('DecisionPanel', () => {
  it('shows placeholder when signal is null', () => {
    render(<DecisionPanel signal={null} />)
    expect(screen.getByText(/Interview signals will appear here/i)).toBeInTheDocument()
  })

  it('renders one pill per competency with correct variant', () => {
    render(<DecisionPanel signal={makeSignal()} />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.getByText('Weak')).toBeInTheDocument()
    expect(screen.getByText('Not observed')).toBeInTheDocument()
    expect(screen.getByText('Adequate')).toBeInTheDocument()
  })

  it('renders competency names', () => {
    render(<DecisionPanel signal={makeSignal()} />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Testing')).toBeInTheDocument()
  })

  it('renders topics covered', () => {
    render(<DecisionPanel signal={makeSignal()} />)
    expect(screen.getByText('hooks')).toBeInTheDocument()
    expect(screen.getByText('state management')).toBeInTheDocument()
  })

  it('renders gaps as list items', () => {
    render(<DecisionPanel signal={makeSignal()} />)
    expect(screen.getByText('accessibility')).toBeInTheDocument()
    expect(screen.getByText('performance')).toBeInTheDocument()
  })

  it('shows "Nothing flagged yet" when gaps is empty', () => {
    render(<DecisionPanel signal={makeSignal({ gaps: [] })} />)
    expect(screen.getByText('Nothing flagged yet')).toBeInTheDocument()
  })

  it('renders rationale', () => {
    render(<DecisionPanel signal={makeSignal()} />)
    expect(screen.getByText(/testing needs improvement/i)).toBeInTheDocument()
  })
})
