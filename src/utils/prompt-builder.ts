import type { Job, Turn, InterviewSession } from '@/types/domain'
import type { ChatMessage } from '@/adapters/openai-client'

export type NextQuestionPromptInput = {
  job: Job
  session: InterviewSession
  transcript: Turn[]
}

export function buildNextQuestionMessages(input: NextQuestionPromptInput): ChatMessage[] {
  const { job, session, transcript } = input

  const competencyList = job.competencies
    .map((c, i) => `  ${i + 1}. ${c}`)
    .join('\n')

  const askedSourceIds = new Set(
    transcript
      .filter((t) => t.role === 'interviewer' && t.sourceQuestionId != null)
      .map((t) => t.sourceQuestionId!),
  )

  const unaskedPackQuestions = job.questionPack
    .filter((q) => !askedSourceIds.has(q.id))
    .sort((a, b) => a.order - b.order)

  const packSection =
    unaskedPackQuestions.length > 0
      ? `\n\n## Approved Opener Questions\nFor your next non-follow-up question, prefer questions from this list (in order). Set sourceQuestionId to the chosen question's id.\nFor follow-up questions, you may ask anything relevant to the candidate's last answer — leave sourceQuestionId null.\n\n${unaskedPackQuestions.map((q, i) => `  ${i + 1}. [${q.id}] (${q.category} / ${q.competency}) ${q.prompt}`).join('\n')}`
      : ''

  const system = `You are a senior hiring manager conducting a structured job interview for a ${job.title} (${job.level}) role. \
Be warm but rigorous. Ask exactly one question at a time — no multi-part questions.

## Role Context
${job.longDescription}

## Competencies to Evaluate
${competencyList}

## Interview State
- Questions asked so far: ${session.questionsAsked}
- Follow-up questions asked: ${session.followUpsAsked}
- Maximum questions allowed: ${session.maxQuestions}${packSection}

## Instructions
Respond with a JSON object matching the NextQuestionOutput schema.
Assess each competency based on what you have heard so far.
Set shouldEndInterview=true only when you have gathered sufficient signal across the competencies.
Follow-up questions (kind="follow_up") should drill into something the candidate just said.
Primary questions (kind="primary") introduce a new competency topic.`

  const transcriptText =
    transcript.length === 0
      ? '(No conversation yet — this is the start of the interview.)'
      : transcript.map((t) => `[${t.role.toUpperCase()}] ${t.text}`).join('\n\n')

  const user = `## Conversation so far\n\n${transcriptText}\n\nDecide the next interview action.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function buildEvaluationMessages(input: NextQuestionPromptInput): ChatMessage[] {
  const { job, transcript } = input

  const competencyList = job.competencies
    .map((c, i) => `  ${i + 1}. ${c}`)
    .join('\n')

  const system = `You are a senior hiring manager providing a final evaluation of a candidate for the ${job.title} (${job.level}) role.

## Role Context
${job.longDescription}

## Competencies to Evaluate
${competencyList}

## Scoring Guide
- overall_score: 0–100 (50 = average for ${job.level} level; above 70 = strong hire signal)
- competency score: 0–100 per competency
- strengths: specific positive behaviours observed (at least 1)
- concerns: specific gaps or weaknesses (can be empty)

Respond with a JSON object matching the EvaluationOutput schema. Be fair, specific, and evidence-based.`

  const transcriptText = transcript
    .map((t) => `[${t.role.toUpperCase()}] ${t.text}`)
    .join('\n\n')

  const user = `## Full Interview Transcript\n\n${transcriptText}\n\nProvide a comprehensive evaluation of the candidate.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// Legacy export kept for backward compat
export function buildNextQuestionPrompt(input: NextQuestionPromptInput): {
  system: string
  user: string
} {
  const messages = buildNextQuestionMessages(input)
  return { system: messages[0]!.content, user: messages[1]!.content }
}

export function buildEvaluationPrompt(input: NextQuestionPromptInput): {
  system: string
  user: string
} {
  const messages = buildEvaluationMessages(input)
  return { system: messages[0]!.content, user: messages[1]!.content }
}
