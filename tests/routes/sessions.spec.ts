import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type {
  DecisionSignal,
  Evaluation,
  InterviewSession,
  Job,
  Turn,
} from '@/types/domain'
import { AppError } from '@/types/errors'

vi.mock('@/services/session-service', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  submitAnswer: vi.fn(),
  abandonSession: vi.fn(),
}))

import { createApp } from '@/index'
import * as sessionService from '@/services/session-service'

const baseSession: InterviewSession = {
  id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  jobId: '11111111-1111-4111-8111-111111111111',
  softUserId: null,
  status: 'in_progress',
  maxQuestions: 8,
  questionsAsked: 1,
  followUpsAsked: 0,
  videoEnabled: false,
  startedAt: '2026-04-21T00:00:00.000Z',
  endedAt: null,
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
}

const baseJob: Job = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'frontend-engineer',
  title: 'Frontend Engineer',
  shortDescription: 'Build UIs.',
  longDescription: 'Own the web app.',
  level: 'mid',
  competencies: ['React', 'TypeScript', 'Accessibility (a11y)'],
  questionPack: [],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
}

const openerTurn: Turn = {
  id: 'tttttttt-tttt-4ttt-tttt-tttttttttttt',
  sessionId: baseSession.id,
  role: 'interviewer',
  index: 1,
  text: 'Tell me about yourself.',
  questionKind: 'opener',
  sttConfidence: null,
  audioUrl: null,
  sourceQuestionId: null,
  spokenDurationMs: null,
  createdAt: '2026-04-21T00:00:00.000Z',
}

const candidateTurn: Turn = {
  id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
  sessionId: baseSession.id,
  role: 'candidate',
  index: 2,
  text: 'I am a frontend engineer with 5 years experience.',
  questionKind: null,
  sttConfidence: 0.95,
  audioUrl: null,
  sourceQuestionId: null,
  spokenDurationMs: null,
  createdAt: '2026-04-21T00:05:00.000Z',
}

const nextInterviewerTurn: Turn = {
  id: 'iiiiiiii-iiii-4iii-iiii-iiiiiiiiiiii',
  sessionId: baseSession.id,
  role: 'interviewer',
  index: 3,
  text: 'What React patterns do you use?',
  questionKind: 'primary',
  sttConfidence: null,
  audioUrl: null,
  sourceQuestionId: null,
  spokenDurationMs: null,
  createdAt: '2026-04-21T00:06:00.000Z',
}

const decisionSignal: DecisionSignal = {
  id: 'ssssssss-ssss-4sss-ssss-ssssssssssss',
  sessionId: baseSession.id,
  afterTurnIndex: 2,
  competencies: [{ competency: 'React', level: 'weak', evidence: null }],
  topicsCovered: [],
  gaps: ['React depth'],
  nextQuestionRationale: 'Probe React deeper.',
  nextQuestionKind: 'primary',
  createdAt: '2026-04-21T00:06:00.000Z',
}

const evaluation: Evaluation = {
  id: 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
  sessionId: baseSession.id,
  overallScore: 78,
  summary: 'Solid candidate.',
  strengths: ['React expertise'],
  concerns: [],
  competencyScores: [{ competency: 'React', score: 85, rationale: 'Good React.' }],
  rawModelOutput: '{}',
  createdAt: '2026-04-21T00:30:00.000Z',
}

describe('POST /api/v1/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates session and returns 201 with session + firstTurn', async () => {
    vi.mocked(sessionService.createSession).mockResolvedValue({
      session: baseSession,
      firstTurn: openerTurn,
    })

    const app = createApp()
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({ jobId: baseJob.id, videoEnabled: false })

    expect(res.status).toBe(201)
    expect(res.body.data.session.id).toBe(baseSession.id)
    expect(res.body.data.firstTurn.role).toBe('interviewer')
    expect(res.body.data.firstTurn.questionKind).toBe('opener')
  })

  it('returns 404 when jobId does not exist', async () => {
    vi.mocked(sessionService.createSession).mockRejectedValue(
      new AppError('JOB_NOT_FOUND', 'Job not found', 404),
    )
    const app = createApp()
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({ jobId: '00000000-0000-4000-8000-000000000000' })

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('JOB_NOT_FOUND')
  })

  it('returns 400 for invalid jobId', async () => {
    const app = createApp()
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({ jobId: 'not-a-uuid' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/v1/sessions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns full session state', async () => {
    vi.mocked(sessionService.getSession).mockResolvedValue({
      session: baseSession,
      job: baseJob,
      turns: [openerTurn],
      evaluation: null,
      decisionSignals: [],
    })

    const app = createApp()
    const res = await request(app).get(`/api/v1/sessions/${baseSession.id}`)

    expect(res.status).toBe(200)
    expect(res.body.data.session).toBeDefined()
    expect(res.body.data.job).toBeDefined()
    expect(res.body.data.turns).toBeInstanceOf(Array)
    expect(res.body.data.evaluation).toBeNull()
    expect(res.body.data.decisionSignals).toBeInstanceOf(Array)
  })

  it('returns 404 for unknown session', async () => {
    vi.mocked(sessionService.getSession).mockRejectedValue(
      new AppError('SESSION_NOT_FOUND', 'Session not found', 404),
    )

    const app = createApp()
    const res = await request(app).get(`/api/v1/sessions/${baseSession.id}`)

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND')
  })
})

describe('POST /api/v1/sessions/:id/turns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with next interviewer turn when continuing', async () => {
    vi.mocked(sessionService.submitAnswer).mockResolvedValue({
      candidateTurn,
      nextInterviewerTurn,
      evaluation: null,
      decisionSignal,
    })

    const app = createApp()
    const res = await request(app)
      .post(`/api/v1/sessions/${baseSession.id}/turns`)
      .send({ text: candidateTurn.text, sttConfidence: 0.95 })

    expect(res.status).toBe(200)
    expect(res.body.data.candidateTurn.role).toBe('candidate')
    expect(res.body.data.nextInterviewerTurn).not.toBeNull()
    expect(res.body.data.evaluation).toBeNull()
    expect(res.body.data.decisionSignal).not.toBeNull()
  })

  it('returns 200 with evaluation when interview ends', async () => {
    vi.mocked(sessionService.submitAnswer).mockResolvedValue({
      candidateTurn,
      nextInterviewerTurn: null,
      evaluation,
      decisionSignal: null,
    })

    const app = createApp()
    const res = await request(app)
      .post(`/api/v1/sessions/${baseSession.id}/turns`)
      .send({ text: candidateTurn.text })

    expect(res.status).toBe(200)
    expect(res.body.data.evaluation).not.toBeNull()
    expect(res.body.data.evaluation.overallScore).toBe(78)
    expect(res.body.data.nextInterviewerTurn).toBeNull()
  })

  it('returns 409 SESSION_ALREADY_COMPLETED', async () => {
    vi.mocked(sessionService.submitAnswer).mockRejectedValue(
      new AppError('SESSION_ALREADY_COMPLETED', 'Already completed', 409),
    )

    const app = createApp()
    const res = await request(app)
      .post(`/api/v1/sessions/${baseSession.id}/turns`)
      .send({ text: 'hello' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('SESSION_ALREADY_COMPLETED')
  })

  it('returns 422 TURN_OUT_OF_ORDER', async () => {
    vi.mocked(sessionService.submitAnswer).mockRejectedValue(
      new AppError('TURN_OUT_OF_ORDER', 'Out of order', 422),
    )

    const app = createApp()
    const res = await request(app)
      .post(`/api/v1/sessions/${baseSession.id}/turns`)
      .send({ text: 'hello' })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('TURN_OUT_OF_ORDER')
  })

  it('returns 400 for empty text', async () => {
    const app = createApp()
    const res = await request(app)
      .post(`/api/v1/sessions/${baseSession.id}/turns`)
      .send({ text: '' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/v1/sessions/:id/abandon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 when abandoning an active session', async () => {
    const abandonedSession = { ...baseSession, status: 'abandoned' as const }
    vi.mocked(sessionService.abandonSession).mockResolvedValue({ session: abandonedSession })

    const app = createApp()
    const res = await request(app).post(`/api/v1/sessions/${baseSession.id}/abandon`)

    expect(res.status).toBe(200)
    expect(res.body.data.session.status).toBe('abandoned')
  })

  it('is idempotent — second abandon also returns 200', async () => {
    const abandonedSession = { ...baseSession, status: 'abandoned' as const }
    vi.mocked(sessionService.abandonSession)
      .mockResolvedValueOnce({ session: abandonedSession })
      .mockResolvedValueOnce({ session: abandonedSession })

    const app = createApp()
    const res1 = await request(app).post(`/api/v1/sessions/${baseSession.id}/abandon`)
    const res2 = await request(app).post(`/api/v1/sessions/${baseSession.id}/abandon`)

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })

  it('returns 404 for unknown session', async () => {
    vi.mocked(sessionService.abandonSession).mockRejectedValue(
      new AppError('SESSION_NOT_FOUND', 'Not found', 404),
    )

    const app = createApp()
    const res = await request(app).post(`/api/v1/sessions/${baseSession.id}/abandon`)

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND')
  })
})

describe('Full lifecycle: create → 6 answers → evaluation', () => {
  it('completes with followUpsAsked >= 2', async () => {
    const completedSession: InterviewSession = {
      ...baseSession,
      status: 'completed',
      questionsAsked: 8,
      followUpsAsked: 2,
      endedAt: '2026-04-21T00:30:00.000Z',
    }

    vi.mocked(sessionService.createSession).mockResolvedValue({
      session: baseSession,
      firstTurn: openerTurn,
    })

    vi.mocked(sessionService.submitAnswer)
      .mockResolvedValueOnce({
        candidateTurn,
        nextInterviewerTurn,
        evaluation: null,
        decisionSignal,
      })
      .mockResolvedValueOnce({
        candidateTurn,
        nextInterviewerTurn,
        evaluation: null,
        decisionSignal,
      })
      .mockResolvedValueOnce({
        candidateTurn,
        nextInterviewerTurn,
        evaluation: null,
        decisionSignal,
      })
      .mockResolvedValueOnce({
        candidateTurn,
        nextInterviewerTurn,
        evaluation: null,
        decisionSignal,
      })
      .mockResolvedValueOnce({
        candidateTurn,
        nextInterviewerTurn,
        evaluation: null,
        decisionSignal,
      })
      .mockResolvedValueOnce({
        candidateTurn,
        nextInterviewerTurn: null,
        evaluation,
        decisionSignal: null,
      })

    const app = createApp()

    const createRes = await request(app)
      .post('/api/v1/sessions')
      .send({ jobId: baseJob.id })
    expect(createRes.status).toBe(201)

    let lastRes
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post(`/api/v1/sessions/${baseSession.id}/turns`)
        .send({ text: `Answer ${i + 1}` })
      expect(lastRes.status).toBe(200)
    }

    expect(lastRes?.body.data.evaluation).not.toBeNull()
    expect(completedSession.followUpsAsked).toBeGreaterThanOrEqual(2)
  })
})
