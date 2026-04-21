import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Evaluation, EvaluationOutput, InterviewSession, Job, Turn } from '@/types/domain'
import { AppError } from '@/types/errors'

vi.mock('@/adapters/openai-client', () => ({
  chatJson: vi.fn(),
}))

vi.mock('@/db/evaluation-repo', () => ({
  insertEvaluation: vi.fn(),
  getEvaluationBySession: vi.fn(),
}))

import { generate } from '@/services/evaluation-service'
import { chatJson } from '@/adapters/openai-client'
import * as evaluationRepo from '@/db/evaluation-repo'

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

const baseSession: InterviewSession = {
  id: 'sess-0001-0001-0001-000000000001',
  jobId: baseJob.id,
  softUserId: null,
  status: 'completed',
  maxQuestions: 8,
  questionsAsked: 6,
  followUpsAsked: 2,
  videoEnabled: false,
  startedAt: '2026-04-21T00:00:00.000Z',
  endedAt: '2026-04-21T00:30:00.000Z',
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:30:00.000Z',
}

const turns: Turn[] = [
  {
    id: 't1',
    sessionId: baseSession.id,
    role: 'interviewer',
    index: 1,
    text: 'Tell me about React.',
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
    text: 'I have 5 years of React experience.',
    questionKind: null,
    sttConfidence: 0.95,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: null,
    createdAt: '2026-04-21T00:05:00.000Z',
  },
]

const llmOutput: EvaluationOutput = {
  overallScore: 78,
  summary: 'Strong mid-level candidate.',
  strengths: ['React expertise', 'Clear communication'],
  concerns: ['Limited accessibility knowledge'],
  competencyScores: [
    { competency: 'React', score: 85, rationale: 'Strong React answers.' },
    { competency: 'TypeScript', score: 70, rationale: 'Decent TypeScript.' },
    { competency: 'Accessibility (a11y)', score: 55, rationale: 'Shallow a11y answers.' },
  ],
}

const storedEvaluation: Evaluation = {
  id: 'eval-1111-1111-1111-111111111111',
  sessionId: baseSession.id,
  ...llmOutput,
  rawModelOutput: JSON.stringify(llmOutput),
  createdAt: '2026-04-21T00:30:00.000Z',
}

describe('EvaluationService.generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path produces a valid evaluation row', async () => {
    vi.mocked(chatJson).mockResolvedValue(llmOutput)
    vi.mocked(evaluationRepo.insertEvaluation).mockResolvedValue(storedEvaluation)

    const result = await generate({ session: baseSession, turns, job: baseJob })

    expect(result.overallScore).toBe(78)
    expect(result.strengths).toHaveLength(2)
    expect(result.competencyScores.length).toBeGreaterThanOrEqual(1)
    expect(result.sessionId).toBe(baseSession.id)
  })

  it('double-call returns existing row without error', async () => {
    vi.mocked(chatJson).mockResolvedValue(llmOutput)
    vi.mocked(evaluationRepo.insertEvaluation).mockRejectedValue(
      new AppError('EVALUATION_ALREADY_EXISTS', 'Already exists', 409),
    )
    vi.mocked(evaluationRepo.getEvaluationBySession).mockResolvedValue(storedEvaluation)

    const result = await generate({ session: baseSession, turns, job: baseJob })

    expect(result.id).toBe(storedEvaluation.id)
    expect(evaluationRepo.getEvaluationBySession).toHaveBeenCalledWith(baseSession.id)
  })

  it('throws LLM_OUTPUT_INVALID when LLM schema fails twice, no row written', async () => {
    vi.mocked(chatJson).mockRejectedValue(
      new AppError('LLM_OUTPUT_INVALID', 'Schema fail', 502),
    )

    await expect(generate({ session: baseSession, turns, job: baseJob })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.code === 'LLM_OUTPUT_INVALID',
    )

    expect(evaluationRepo.insertEvaluation).not.toHaveBeenCalled()
  })
})
