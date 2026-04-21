import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InterviewSession, Job, NextQuestionOutput, Turn } from '@/types/domain'

vi.mock('@/adapters/openai-client', () => ({
  chatJson: vi.fn(),
}))

import { decide } from '@/services/interviewer-service'
import { chatJson } from '@/adapters/openai-client'

const baseJob: Job = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'frontend-engineer',
  title: 'Frontend Engineer',
  shortDescription: 'Build UIs.',
  longDescription: 'Own the web app end-to-end.',
  level: 'mid',
  competencies: ['React', 'TypeScript', 'Accessibility (a11y)'],
  questionPack: [],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
}

function makeSession(overrides: Partial<InterviewSession> = {}): InterviewSession {
  return {
    id: 'sess-0001-0001-0001-000000000001',
    jobId: baseJob.id,
    softUserId: null,
    status: 'in_progress',
    maxQuestions: 10,
    questionsAsked: 0,
    followUpsAsked: 0,
    videoEnabled: false,
    startedAt: '2026-04-21T00:00:00.000Z',
    endedAt: null,
    createdAt: '2026-04-21T00:00:00.000Z',
    updatedAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

function makeInterviewerTurn(index: number, kind: NextQuestionOutput['kind'] = 'primary'): Turn {
  return {
    id: `turn-${index}`,
    sessionId: 'sess-0001-0001-0001-000000000001',
    role: 'interviewer',
    index,
    text: `Question ${index}`,
    questionKind: kind,
    sttConfidence: null,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: null,
    createdAt: '2026-04-21T00:00:00.000Z',
  }
}

function makeCandidateTurn(index: number): Turn {
  return {
    id: `turn-${index}`,
    sessionId: 'sess-0001-0001-0001-000000000001',
    role: 'candidate',
    index,
    text: `Answer ${index}`,
    questionKind: null,
    sttConfidence: null,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: null,
    createdAt: '2026-04-21T00:00:00.000Z',
  }
}

function makeLlmOutput(overrides: Partial<NextQuestionOutput> = {}): NextQuestionOutput {
  return {
    kind: 'primary',
    question: 'Tell me about your React experience.',
    rationale: 'Assessing React knowledge.',
    sourceQuestionId: null,
    signals: {
      competencies: [{ competency: 'React', level: 'not_observed', evidence: null }],
      topicsCovered: [],
      gaps: ['React'],
    },
    shouldEndInterview: false,
    ...overrides,
  }
}

describe('InterviewerService.decide — deterministic guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('coerces kind to opener when no prior candidate turns (guard 4)', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ kind: 'follow_up' }))

    const result = await decide({ session: makeSession(), turns: [], job: baseJob })

    expect(result.kind).toBe('opener')
  })

  it('forces shouldEndInterview=false when questionsAsked < 6 (guard 1)', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ shouldEndInterview: true }))

    const session = makeSession({ questionsAsked: 3 })
    const turns = [makeInterviewerTurn(1), makeCandidateTurn(2)]
    const result = await decide({ session, turns, job: baseJob })

    expect(result.shouldEndInterview).toBe(false)
  })

  it('forces shouldEndInterview=true when questionsAsked >= maxQuestions (guard 2)', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ shouldEndInterview: false }))

    const session = makeSession({ questionsAsked: 10, maxQuestions: 10 })
    const turns = [makeInterviewerTurn(1), makeCandidateTurn(2)]
    const result = await decide({ session, turns, job: baseJob })

    expect(result.shouldEndInterview).toBe(true)
  })

  it('coerces kind to follow_up when followUpsAsked < 2 and questionsAsked >= 5 (guard 3)', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ kind: 'primary' }))

    const session = makeSession({ questionsAsked: 5, followUpsAsked: 0 })
    const turns = [makeInterviewerTurn(1), makeCandidateTurn(2)]
    const result = await decide({ session, turns, job: baseJob })

    expect(result.kind).toBe('follow_up')
  })

  it('does NOT coerce to follow_up if followUpsAsked already >= 2', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ kind: 'primary' }))

    const session = makeSession({ questionsAsked: 6, followUpsAsked: 2 })
    const turns = [makeInterviewerTurn(1), makeCandidateTurn(2)]
    const result = await decide({ session, turns, job: baseJob })

    expect(result.kind).toBe('primary')
  })

  it('does NOT coerce to follow_up when questionsAsked < 5', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ kind: 'primary' }))

    const session = makeSession({ questionsAsked: 4, followUpsAsked: 0 })
    const turns = [makeInterviewerTurn(1), makeCandidateTurn(2)]
    const result = await decide({ session, turns, job: baseJob })

    expect(result.kind).toBe('primary')
  })

  it('6-turn scripted session produces followUpsAsked >= 2', async () => {
    vi.mocked(chatJson).mockResolvedValue(makeLlmOutput({ kind: 'primary', shouldEndInterview: false }))

    let session = makeSession({ questionsAsked: 1, followUpsAsked: 0, maxQuestions: 10 })
    const turnsList: Turn[] = [makeInterviewerTurn(1, 'opener')]
    let followUpsCount = 0

    for (let i = 0; i < 6; i++) {
      const candidateIdx = turnsList.length + 1
      turnsList.push(makeCandidateTurn(candidateIdx))

      const result = await decide({ session, turns: turnsList, job: baseJob })

      const interviewerIdx = turnsList.length + 1
      turnsList.push(makeInterviewerTurn(interviewerIdx, result.kind))

      if (result.kind === 'follow_up') followUpsCount++

      session = makeSession({
        questionsAsked: session.questionsAsked + 1,
        followUpsAsked: followUpsCount,
        maxQuestions: 10,
      })
    }

    expect(followUpsCount).toBeGreaterThanOrEqual(2)
  })
})
