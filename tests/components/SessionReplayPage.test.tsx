import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SessionReplayPage from '@ui/pages/SessionReplayPage'
import * as sessionsApi from '@ui/api/sessions'
import type { Evaluation, InterviewSession, Job, Turn, DecisionSignal } from '@/types/domain'

vi.mock('@ui/api/sessions')

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

function makeJob(): Job {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    shortDescription: 'Build UIs.',
    longDescription: 'Build great UIs with React and TypeScript.',
    level: 'mid',
    competencies: ['React', 'TypeScript'],
    questionPack: [],
    createdAt: '2026-04-21T00:00:00.000Z',
    updatedAt: '2026-04-21T00:00:00.000Z',
  }
}

function makeSession(): InterviewSession {
  return {
    id: 'session-1',
    jobId: '11111111-1111-4111-8111-111111111111',
    softUserId: null,
    status: 'completed',
    maxQuestions: 6,
    questionsAsked: 6,
    followUpsAsked: 2,
    videoEnabled: false,
    startedAt: '2026-04-21T10:00:00.000Z',
    endedAt: '2026-04-21T10:25:00.000Z',
    createdAt: '2026-04-21T10:00:00.000Z',
    updatedAt: '2026-04-21T10:25:00.000Z',
  }
}

function makeTurn(overrides: Partial<Turn> = {}): Turn {
  return {
    id: 'turn-1',
    sessionId: 'session-1',
    role: 'interviewer',
    index: 1,
    text: 'Tell me about yourself.',
    questionKind: 'opener',
    sttConfidence: null,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: null,
    createdAt: '2026-04-21T10:01:00.000Z',
    ...overrides,
  }
}

function makeEvaluation(): Evaluation {
  return {
    id: 'eval-1',
    sessionId: 'session-1',
    overallScore: 78,
    summary: 'Strong candidate.',
    strengths: ['Good communication'],
    concerns: [],
    competencyScores: [],
    rawModelOutput: '{}',
    createdAt: '2026-04-21T10:25:00.000Z',
  }
}

function renderPage(sessionId = 'session-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/replay/${sessionId}`]}>
        <Routes>
          <Route path="/replay/:id" element={<SessionReplayPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SessionReplayPage', () => {
  it('renders evaluation and transcript turns', async () => {
    vi.mocked(sessionsApi.getSession).mockResolvedValue({
      session: makeSession(),
      job: makeJob(),
      turns: [makeTurn(), makeTurn({ id: 'turn-2', role: 'candidate', index: 2, text: 'I have 5 years experience.' })],
      evaluation: makeEvaluation(),
      decisionSignals: [] as DecisionSignal[],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Interview Replay')).toBeInTheDocument()
      expect(screen.getByText('Frontend Engineer · mid')).toBeInTheDocument()
    })

    expect(screen.getByText('Tell me about yourself.')).toBeInTheDocument()
    expect(screen.getByText('I have 5 years experience.')).toBeInTheDocument()
    expect(screen.getByText('78')).toBeInTheDocument()
  })

  it('renders "Back to history" link', async () => {
    vi.mocked(sessionsApi.getSession).mockResolvedValue({
      session: makeSession(),
      job: makeJob(),
      turns: [],
      evaluation: null,
      decisionSignals: [] as DecisionSignal[],
    })

    renderPage()

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Back to history/i })
      expect(link).toHaveAttribute('href', '/history')
    })
  })

  it('does not render evaluation card when evaluation is null', async () => {
    vi.mocked(sessionsApi.getSession).mockResolvedValue({
      session: makeSession(),
      job: makeJob(),
      turns: [],
      evaluation: null,
      decisionSignals: [] as DecisionSignal[],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Interview Replay')).toBeInTheDocument()
    })

    expect(screen.queryByText('Overall score')).not.toBeInTheDocument()
  })
})
