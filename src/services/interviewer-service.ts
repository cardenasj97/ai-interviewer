import { chatJson } from '@/adapters/openai-client'
import { buildNextQuestionMessages } from '@/utils/prompt-builder'
import {
  NextQuestionOutputSchema,
  type InterviewSession,
  type Job,
  type NextQuestionOutput,
  type Turn,
} from '@/types/domain'
import { logger } from '@/utils/log'

export async function decide(input: {
  session: InterviewSession
  turns: Turn[]
  job: Job
}): Promise<NextQuestionOutput> {
  const { session, turns, job } = input

  const messages = buildNextQuestionMessages({ job, session, transcript: turns })

  let output = await chatJson({
    messages,
    schema: NextQuestionOutputSchema,
    schemaName: 'next_question',
  })

  const priorCandidateTurns = turns.filter((t) => t.role === 'candidate')

  // Guard 4: no prior candidate turns → opener
  if (priorCandidateTurns.length === 0) {
    output = { ...output, kind: 'opener' }
  }

  // Guard 1: questionsAsked < 6 → force shouldEndInterview = false
  if (session.questionsAsked < 6) {
    output = { ...output, shouldEndInterview: false }
  }

  // Guard 2: questionsAsked >= maxQuestions → force shouldEndInterview = true
  if (session.questionsAsked >= session.maxQuestions) {
    output = { ...output, shouldEndInterview: true }
  }

  // Guard 3: followUpsAsked < 2 && questionsAsked >= 5 && prior candidate turn exists
  if (
    session.followUpsAsked < 2 &&
    session.questionsAsked >= 5 &&
    priorCandidateTurns.length > 0
  ) {
    output = { ...output, kind: 'follow_up' }
  }

  if (output.shouldEndInterview) {
    logger.info(
      { sessionId: session.id, questionsAsked: session.questionsAsked },
      'interviewer decided to end interview',
    )
  }

  return output
}
