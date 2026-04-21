import { describe, it, expect } from 'vitest'
import type { InterviewSession, Job, Turn } from '@/types/domain'
import { buildNextQuestionMessages } from '@/utils/prompt-builder'

const seedFrontendEngineer: Job = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'frontend-engineer',
  title: 'Frontend Engineer',
  shortDescription: 'Build delightful, accessible UIs with React and TypeScript.',
  longDescription:
    'As a Frontend Engineer you will own a customer-facing web app end-to-end — architecture, state management, accessibility, performance, and testing. You collaborate closely with design and backend, and you write code that other engineers enjoy reading.',
  level: 'mid',
  competencies: [
    'React',
    'TypeScript',
    'Accessibility (a11y)',
    'State management',
    'Testing',
    'Performance',
  ],
  questionPack: [
    {
      id: 'fe-tech-typed-forms',
      category: 'technical',
      prompt: 'Walk me through how you would build a type-safe form with validation.',
    },
  ],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
}

const baseSession: InterviewSession = {
  id: 'sess-snap-0001-0001-000000000001',
  jobId: seedFrontendEngineer.id,
  softUserId: null,
  status: 'in_progress',
  maxQuestions: 8,
  questionsAsked: 2,
  followUpsAsked: 0,
  videoEnabled: false,
  startedAt: '2026-04-21T00:00:00.000Z',
  endedAt: null,
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
}

const fixedTurns: Turn[] = [
  {
    id: 't1',
    sessionId: baseSession.id,
    role: 'interviewer',
    index: 1,
    text: 'Thanks for joining. Can you walk me through your background?',
    questionKind: 'opener',
    sttConfidence: null,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: null,
    createdAt: '2026-04-21T00:00:00.000Z',
  },
  {
    id: 't2',
    sessionId: baseSession.id,
    role: 'candidate',
    index: 2,
    text: 'I have 4 years of experience building React apps. I focus on component architecture and testing.',
    questionKind: null,
    sttConfidence: 0.93,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: 8500,
    createdAt: '2026-04-21T00:02:00.000Z',
  },
]

describe('buildNextQuestionMessages snapshot', () => {
  it('matches snapshot', () => {
    const messages = buildNextQuestionMessages({
      job: seedFrontendEngineer,
      session: baseSession,
      transcript: fixedTurns,
    })

    expect(messages).toMatchSnapshot()
  })

  it('system prompt includes job title', () => {
    const messages = buildNextQuestionMessages({
      job: seedFrontendEngineer,
      session: baseSession,
      transcript: fixedTurns,
    })
    expect(messages[0]!.content).toContain('Frontend Engineer')
  })

  it('system prompt includes every competency', () => {
    const messages = buildNextQuestionMessages({
      job: seedFrontendEngineer,
      session: baseSession,
      transcript: fixedTurns,
    })
    for (const comp of seedFrontendEngineer.competencies) {
      expect(messages[0]!.content).toContain(comp)
    }
  })

  it('user prompt includes all prior turns', () => {
    const messages = buildNextQuestionMessages({
      job: seedFrontendEngineer,
      session: baseSession,
      transcript: fixedTurns,
    })
    for (const turn of fixedTurns) {
      expect(messages[1]!.content).toContain(turn.text)
    }
  })
})
