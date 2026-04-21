import { describe, it, expect } from 'vitest'
import { interviewReducer, initialState, type InterviewState, type InterviewAction } from '@ui/state/interview-reducer'
import type { Turn, Evaluation, DecisionSignal } from '@/types/domain'

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
    createdAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    id: 'eval-1',
    sessionId: 'session-1',
    overallScore: 78,
    summary: 'Good candidate.',
    strengths: ['Strong React knowledge'],
    concerns: [],
    competencyScores: [{ competency: 'React', score: 85, rationale: 'Explained hooks clearly.' }],
    rawModelOutput: '{}',
    createdAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

function makeSignal(overrides: Partial<DecisionSignal> = {}): DecisionSignal {
  return {
    id: 'signal-1',
    sessionId: 'session-1',
    afterTurnIndex: 2,
    competencies: [{ competency: 'React', level: 'adequate', evidence: null }],
    topicsCovered: ['hooks'],
    gaps: [],
    nextQuestionRationale: 'Needs deeper testing knowledge.',
    nextQuestionKind: 'primary',
    createdAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

function reduce(state: InterviewState, action: InterviewAction) {
  return interviewReducer(state, action)
}

describe('interviewReducer', () => {
  it('starts in idle phase', () => {
    expect(initialState.phase).toBe('idle')
  })

  it('idle → requestingMic on START', () => {
    const next = reduce(initialState, { type: 'START' })
    expect(next.phase).toBe('requestingMic')
  })

  it('clears error on START from error state', () => {
    const errState: InterviewState = { ...initialState, phase: 'error', errorCode: 'INTERNAL_ERROR', errorMessage: 'oops' }
    const next = reduce(errState, { type: 'START' })
    expect(next.phase).toBe('requestingMic')
    expect(next.errorCode).toBeNull()
  })

  it('requestingMic → listening on MIC_GRANTED', () => {
    const s = reduce(initialState, { type: 'START' })
    const next = reduce(s, { type: 'MIC_GRANTED' })
    expect(next.phase).toBe('listening')
  })

  it('listening → transcribing on AUDIO_READY', () => {
    const s0 = reduce(initialState, { type: 'START' })
    const s1 = reduce(s0, { type: 'MIC_GRANTED' })
    const next = reduce(s1, { type: 'AUDIO_READY' })
    expect(next.phase).toBe('transcribing')
  })

  it('transcribing → awaitingInterviewer on STT_DONE', () => {
    const s0 = reduce(initialState, { type: 'START' })
    const s1 = reduce(s0, { type: 'MIC_GRANTED' })
    const s2 = reduce(s1, { type: 'AUDIO_READY' })
    const next = reduce(s2, { type: 'STT_DONE' })
    expect(next.phase).toBe('awaitingInterviewer')
  })

  it('awaitingInterviewer → speaking on ANSWER_ACCEPTED', () => {
    const candidateTurn = makeTurn({ role: 'candidate', index: 2, questionKind: null })
    const nextTurn = makeTurn({ index: 3 })
    const signal = makeSignal()

    const s0 = { ...initialState, phase: 'awaitingInterviewer' as const }
    const next = reduce(s0, { type: 'ANSWER_ACCEPTED', candidateTurn, nextTurn, decisionSignal: signal })
    expect(next.phase).toBe('speaking')
    expect(next.turns).toHaveLength(2)
    expect(next.decisionSignal).toEqual(signal)
  })

  it('speaking → listening on TTS_ENDED', () => {
    const s0 = { ...initialState, phase: 'speaking' as const }
    const next = reduce(s0, { type: 'TTS_ENDED' })
    expect(next.phase).toBe('listening')
  })

  it('any phase → error on FAILED', () => {
    const phases: Array<InterviewState['phase']> = [
      'idle', 'requestingMic', 'listening', 'transcribing',
      'awaitingInterviewer', 'speaking',
    ]
    for (const phase of phases) {
      const s = { ...initialState, phase }
      const next = reduce(s, { type: 'FAILED', code: 'LLM_PROVIDER_ERROR', message: 'oops' })
      expect(next.phase).toBe('error')
      expect(next.errorCode).toBe('LLM_PROVIDER_ERROR')
    }
  })

  it('MIC_DENIED sets error phase with MIC_DENIED code', () => {
    const s = reduce(initialState, { type: 'START' })
    const next = reduce(s, { type: 'MIC_DENIED' })
    expect(next.phase).toBe('error')
    expect(next.errorCode).toBe('MIC_DENIED')
  })

  it('FINISHED stores evaluation and candidate turn', () => {
    const s0 = { ...initialState, phase: 'awaitingInterviewer' as const, sessionId: 'session-1' }
    const candidateTurn = makeTurn({ role: 'candidate', index: 2, questionKind: null })
    const evaluation = makeEvaluation()
    const next = reduce(s0, { type: 'FINISHED', candidateTurn, evaluation, decisionSignal: null })
    expect(next.phase).toBe('finished')
    expect(next.evaluation).toEqual(evaluation)
    expect(next.turns).toContain(candidateTurn)
  })

  it('REHYDRATE sets listening phase with turns', () => {
    const turns = [makeTurn(), makeTurn({ role: 'candidate', index: 2, questionKind: null })]
    const next = reduce(initialState, {
      type: 'REHYDRATE',
      sessionId: 'session-abc',
      turns,
      decisionSignal: null,
    })
    expect(next.phase).toBe('listening')
    expect(next.sessionId).toBe('session-abc')
    expect(next.turns).toHaveLength(2)
  })

  it('RETRY from error → idle', () => {
    const s = reduce(initialState, { type: 'FAILED', code: 'X', message: 'y' })
    const next = reduce(s, { type: 'RETRY' })
    expect(next.phase).toBe('idle')
    expect(next.errorCode).toBeNull()
  })

  it('ignores invalid transitions (not throws)', () => {
    // MIC_GRANTED when not in requestingMic
    const s = reduce(initialState, { type: 'MIC_GRANTED' })
    expect(s.phase).toBe('idle')

    // AUDIO_READY when not in listening
    const s2 = reduce(initialState, { type: 'AUDIO_READY' })
    expect(s2.phase).toBe('idle')

    // TTS_ENDED when not speaking
    const s3 = reduce(initialState, { type: 'TTS_ENDED' })
    expect(s3.phase).toBe('idle')
  })

  it('SESSION_CREATED adds first turn to state', () => {
    const firstTurn = makeTurn()
    const next = reduce(initialState, { type: 'SESSION_CREATED', sessionId: 'sid', firstTurn })
    expect(next.sessionId).toBe('sid')
    expect(next.turns).toHaveLength(1)
    expect(next.turns[0]).toEqual(firstTurn)
  })
})
