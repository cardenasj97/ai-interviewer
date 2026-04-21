import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { interviewSessions, turns as turnsTable, decisionSignals as decisionSignalsTable } from '@/db/schema'
import * as sessionRepo from '@/db/session-repo'
import * as turnRepo from '@/db/turn-repo'
import * as jobRepo from '@/db/job-repo'
import * as evaluationRepo from '@/db/evaluation-repo'
import * as signalRepo from '@/db/decision-signal-repo'
import * as interviewerService from '@/services/interviewer-service'
import * as evaluationService from '@/services/evaluation-service'
import {
  type CreateSessionRequest,
  type DecisionSignal,
  type Evaluation,
  type InterviewSession,
  type Job,
  type SubmitAnswerRequest,
  type Turn,
} from '@/types/domain'
import { AppError } from '@/types/errors'
import { uuid } from '@/utils/ids'
import { logger } from '@/utils/log'

const SESSION_STALE_MS = 60 * 60 * 1000 // 1 hour

function rowToSession(row: typeof interviewSessions.$inferSelect): InterviewSession {
  return {
    id: row.id,
    jobId: row.jobId,
    softUserId: row.softUserId ?? null,
    status: row.status,
    maxQuestions: row.maxQuestions,
    questionsAsked: row.questionsAsked,
    followUpsAsked: row.followUpsAsked,
    videoEnabled: row.videoEnabled,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function rowToTurn(row: typeof turnsTable.$inferSelect): Turn {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    index: row.index,
    text: row.text,
    questionKind: row.questionKind ?? null,
    sttConfidence: row.sttConfidence ?? null,
    audioUrl: row.audioUrl ?? null,
    videoUrl: row.videoUrl ?? null,
    sourceQuestionId: row.sourceQuestionId ?? null,
    spokenDurationMs: row.spokenDurationMs ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function rowToSignal(row: typeof decisionSignalsTable.$inferSelect): DecisionSignal {
  return {
    id: row.id,
    sessionId: row.sessionId,
    afterTurnIndex: row.afterTurnIndex,
    competencies: row.competencies as DecisionSignal['competencies'],
    topicsCovered: row.topicsCovered,
    gaps: row.gaps,
    nextQuestionRationale: row.nextQuestionRationale,
    nextQuestionKind: row.nextQuestionKind ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function createSession(
  input: CreateSessionRequest & { softUserId: string | null },
): Promise<{ session: InterviewSession; firstTurn: Turn }> {
  const job = await jobRepo.getJobById(input.jobId)

  let session = await sessionRepo.createSession({
    jobId: input.jobId,
    videoEnabled: input.videoEnabled,
    softUserId: input.softUserId,
    maxQuestions: 8,
  })

  const decision = await interviewerService.decide({ session, turns: [], job })

  const firstTurn = await db.transaction(async (tx) => {
    const [turnRow] = await tx
      .insert(turnsTable)
      .values({
        sessionId: session.id,
        role: 'interviewer',
        index: 1,
        text: decision.question,
        questionKind: decision.kind,
      })
      .returning()
    if (!turnRow) throw new AppError('INTERNAL_ERROR', 'Failed to insert opener turn', 500)

    const [sessionRow] = await tx
      .update(interviewSessions)
      .set({ status: 'in_progress', questionsAsked: 1, updatedAt: new Date() })
      .where(eq(interviewSessions.id, session.id))
      .returning()
    if (!sessionRow) throw new AppError('INTERNAL_ERROR', 'Failed to update session', 500)

    session = rowToSession(sessionRow)
    return rowToTurn(turnRow)
  })

  return { session, firstTurn }
}

export async function getSession(id: string): Promise<{
  session: InterviewSession
  job: Job
  turns: Turn[]
  evaluation: Evaluation | null
  decisionSignals: DecisionSignal[]
}> {
  const session = await sessionRepo.getSessionById(id)

  // Lazy stale check on GET
  if (
    session.status === 'in_progress' &&
    Date.now() - new Date(session.startedAt).getTime() > SESSION_STALE_MS
  ) {
    logger.info({ sessionId: id }, 'lazily marking stale session as abandoned')
    await sessionRepo.updateSessionStatus(id, 'abandoned', new Date())
    const updated = await sessionRepo.getSessionById(id)
    const job = await jobRepo.getJobById(updated.jobId)
    const turns = await turnRepo.listTurnsBySession(id)
    const evaluation = await evaluationRepo.getEvaluationBySession(id)
    const decisionSignals = await signalRepo.listSignalsBySession(id)
    return { session: updated, job, turns, evaluation, decisionSignals }
  }

  const [job, turns, evaluation, decisionSignals] = await Promise.all([
    jobRepo.getJobById(session.jobId),
    turnRepo.listTurnsBySession(id),
    evaluationRepo.getEvaluationBySession(id),
    signalRepo.listSignalsBySession(id),
  ])

  return { session, job, turns, evaluation, decisionSignals }
}

export async function submitAnswer(
  sessionId: string,
  input: SubmitAnswerRequest,
): Promise<{
  candidateTurn: Turn
  nextInterviewerTurn: Turn | null
  evaluation: Evaluation | null
  decisionSignal: DecisionSignal | null
}> {
  const session = await sessionRepo.getSessionById(sessionId)

  if (session.status === 'completed') {
    throw new AppError('SESSION_ALREADY_COMPLETED', 'Session is already completed', 409)
  }
  if (session.status === 'abandoned') {
    throw new AppError('SESSION_ABANDONED', 'Session has been abandoned', 409)
  }

  const currentTurns = await turnRepo.listTurnsBySession(sessionId)
  const lastTurn = currentTurns[currentTurns.length - 1]
  if (lastTurn?.role === 'candidate') {
    throw new AppError('TURN_OUT_OF_ORDER', 'Waiting for interviewer — submit after the next question', 422)
  }

  const job = await jobRepo.getJobById(session.jobId)

  const candidateTurnIndex = currentTurns.length + 1

  // Build hypothetical turn list with the incoming answer for LLM context
  const tempCandidateTurn: Turn = {
    id: uuid(),
    sessionId,
    role: 'candidate',
    index: candidateTurnIndex,
    text: input.text,
    questionKind: null,
    sttConfidence: input.sttConfidence ?? null,
    audioUrl: null,
    sourceQuestionId: null,
    spokenDurationMs: input.spokenDurationMs ?? null,
    createdAt: new Date().toISOString(),
  }
  const turnsWithAnswer = [...currentTurns, tempCandidateTurn]

  // LLM call — outside transaction so a failure leaves no DB writes
  const decision = await interviewerService.decide({ session, turns: turnsWithAnswer, job })

  // Evaluation LLM call (if ending) — also outside transaction
  let evaluation: Evaluation | null = null
  if (decision.shouldEndInterview) {
    evaluation = await evaluationService.generate({ session, turns: turnsWithAnswer, job })
  }

  // Single DB transaction for all writes
  const txResult = await db.transaction(async (tx) => {
    // Insert candidate turn
    const [candidateRow] = await tx
      .insert(turnsTable)
      .values({
        sessionId,
        role: 'candidate',
        index: candidateTurnIndex,
        text: input.text,
        questionKind: undefined,
        sttConfidence: input.sttConfidence ?? undefined,
        spokenDurationMs: input.spokenDurationMs ?? undefined,
        videoUrl: input.videoUrl ?? undefined,
      })
      .returning()
    if (!candidateRow) throw new AppError('INTERNAL_ERROR', 'Failed to insert candidate turn', 500)
    const candidateTurn = rowToTurn(candidateRow)

    if (decision.shouldEndInterview) {
      // Update session to completed
      await tx
        .update(interviewSessions)
        .set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() })
        .where(eq(interviewSessions.id, sessionId))

      return { candidateTurn, nextInterviewerTurn: null, decisionSignal: null }
    }

    // Insert decision signal
    const [signalRow] = await tx
      .insert(decisionSignalsTable)
      .values({
        sessionId,
        afterTurnIndex: candidateTurnIndex,
        competencies: decision.signals.competencies as unknown[],
        topicsCovered: decision.signals.topicsCovered,
        gaps: decision.signals.gaps,
        nextQuestionRationale: decision.rationale,
        nextQuestionKind: decision.kind ?? undefined,
      })
      .returning()
    if (!signalRow) throw new AppError('INTERNAL_ERROR', 'Failed to insert decision signal', 500)
    const decisionSignal = rowToSignal(signalRow)

    // Insert next interviewer turn
    const nextTurnIndex = candidateTurnIndex + 1
    const [nextTurnRow] = await tx
      .insert(turnsTable)
      .values({
        sessionId,
        role: 'interviewer',
        index: nextTurnIndex,
        text: decision.question,
        questionKind: decision.kind,
        sourceQuestionId: decision.sourceQuestionId ?? undefined,
      })
      .returning()
    if (!nextTurnRow) throw new AppError('INTERNAL_ERROR', 'Failed to insert interviewer turn', 500)
    const nextInterviewerTurn = rowToTurn(nextTurnRow)

    // Increment counters
    const isFollowUp = decision.kind === 'follow_up'
    await tx
      .update(interviewSessions)
      .set({
        questionsAsked: sql`${interviewSessions.questionsAsked} + 1`,
        followUpsAsked: isFollowUp
          ? sql`${interviewSessions.followUpsAsked} + 1`
          : interviewSessions.followUpsAsked,
        updatedAt: new Date(),
      })
      .where(eq(interviewSessions.id, sessionId))

    return { candidateTurn, nextInterviewerTurn, decisionSignal }
  })

  return {
    candidateTurn: txResult.candidateTurn,
    nextInterviewerTurn: txResult.nextInterviewerTurn,
    evaluation,
    decisionSignal: txResult.decisionSignal,
  }
}

export async function abandonSession(id: string): Promise<{ session: InterviewSession }> {
  const session = await sessionRepo.getSessionById(id)

  if (session.status === 'pending' || session.status === 'in_progress') {
    const updated = await sessionRepo.updateSessionStatus(id, 'abandoned', new Date())
    return { session: updated }
  }

  return { session }
}
