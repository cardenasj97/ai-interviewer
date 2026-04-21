import { z } from 'zod'

// ---------- Shared primitives ----------
export const IdSchema = z.string().uuid()
export type Id = z.infer<typeof IdSchema>

export const TimestampSchema = z.string().datetime()
export type Timestamp = z.infer<typeof TimestampSchema>

export const NonEmptyStringSchema = z.string().min(1).max(4000)

export const LocaleSchema = z.enum(['en-US'])
export type Locale = z.infer<typeof LocaleSchema>

// ---------- Job ----------
export const JobLevelSchema = z.enum(['junior', 'mid', 'senior', 'staff'])
export type JobLevel = z.infer<typeof JobLevelSchema>

export const QuestionPackItemSchema = z.object({
  id: z.string().min(1).max(80),
  category: z.enum(['behavioral', 'technical', 'system-design', 'situational']),
  prompt: z.string().min(1).max(500),
  competency: z.string().min(1).max(80),
  order: z.number().int().min(1),
})
export type QuestionPackItem = z.infer<typeof QuestionPackItemSchema>

export const JobSchema = z.object({
  id: IdSchema,
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(120),
  shortDescription: z.string().min(1).max(400),
  longDescription: z.string().min(1).max(2000),
  level: JobLevelSchema,
  competencies: z.array(z.string().min(1).max(80)).min(3).max(12),
  questionPack: z.array(QuestionPackItemSchema).default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
})
export type Job = z.infer<typeof JobSchema>

export const JobListItemSchema = JobSchema.pick({
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  level: true,
})
export type JobListItem = z.infer<typeof JobListItemSchema>

// ---------- InterviewSession ----------
export const SessionStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'abandoned'])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

export const InterviewSessionSchema = z.object({
  id: IdSchema,
  jobId: IdSchema,
  softUserId: IdSchema.nullable(),
  status: SessionStatusSchema,
  maxQuestions: z.number().int().min(6).max(12).default(6),
  questionsAsked: z.number().int().min(0).default(0),
  followUpsAsked: z.number().int().min(0).default(0),
  videoEnabled: z.boolean().default(false),
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
})
export type InterviewSession = z.infer<typeof InterviewSessionSchema>

// ---------- Turn ----------
export const TurnRoleSchema = z.enum(['interviewer', 'candidate'])
export type TurnRole = z.infer<typeof TurnRoleSchema>

export const QuestionKindSchema = z.enum(['opener', 'primary', 'follow_up', 'closer'])
export type QuestionKind = z.infer<typeof QuestionKindSchema>

export const TurnSchema = z.object({
  id: IdSchema,
  sessionId: IdSchema,
  role: TurnRoleSchema,
  index: z.number().int().min(1),
  text: NonEmptyStringSchema,
  questionKind: QuestionKindSchema.nullable(),
  sttConfidence: z.number().min(0).max(1).nullable(),
  audioUrl: z.string().url().nullable(),
  sourceQuestionId: z.string().min(1).max(80).nullable(),
  spokenDurationMs: z.number().int().min(0).max(300_000).nullable(),
  createdAt: TimestampSchema,
})
export type Turn = z.infer<typeof TurnSchema>

// ---------- DecisionSignal ----------
export const SignalLevelSchema = z.enum(['not_observed', 'weak', 'adequate', 'strong'])
export type SignalLevel = z.infer<typeof SignalLevelSchema>

export const CompetencySignalSchema = z.object({
  competency: z.string().min(1).max(80),
  level: SignalLevelSchema,
  evidence: z.string().max(500).nullable(),
})
export type CompetencySignal = z.infer<typeof CompetencySignalSchema>

export const DecisionSignalSchema = z.object({
  id: IdSchema,
  sessionId: IdSchema,
  afterTurnIndex: z.number().int().min(1),
  competencies: z.array(CompetencySignalSchema),
  topicsCovered: z.array(z.string().min(1).max(80)),
  gaps: z.array(z.string().min(1).max(200)),
  nextQuestionRationale: z.string().max(1000),
  nextQuestionKind: QuestionKindSchema.nullable(),
  createdAt: TimestampSchema,
})
export type DecisionSignal = z.infer<typeof DecisionSignalSchema>

// ---------- Evaluation ----------
export const EvaluationSchema = z.object({
  id: IdSchema,
  sessionId: IdSchema,
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(500),
  strengths: z.array(z.string().min(1).max(300)).min(1).max(8),
  concerns: z.array(z.string().min(1).max(300)).max(8),
  competencyScores: z.array(
    z.object({
      competency: z.string().min(1).max(80),
      score: z.number().int().min(0).max(100),
      rationale: z.string().max(500),
    }),
  ),
  rawModelOutput: z.string().max(20000),
  createdAt: TimestampSchema,
})
export type Evaluation = z.infer<typeof EvaluationSchema>

// ---------- Request / Response DTOs ----------
export const ListJobsResponseSchema = z.object({
  data: z.array(JobListItemSchema),
})

export const GetJobResponseSchema = z.object({
  data: JobSchema,
})

export const CreateSessionRequestSchema = z.object({
  jobId: IdSchema,
  videoEnabled: z.boolean().default(false),
})
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>

export const CreateSessionResponseSchema = z.object({
  data: z.object({
    session: InterviewSessionSchema,
    firstTurn: TurnSchema,
  }),
})

export const SubmitAnswerRequestSchema = z.object({
  text: NonEmptyStringSchema,
  sttConfidence: z.number().min(0).max(1).optional(),
  spokenDurationMs: z.number().int().min(0).max(300_000).optional(),
})
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>

export const SubmitAnswerResponseSchema = z.object({
  data: z.object({
    candidateTurn: TurnSchema,
    nextInterviewerTurn: TurnSchema.nullable(),
    evaluation: EvaluationSchema.nullable(),
    decisionSignal: DecisionSignalSchema.nullable(),
  }),
})

export const GetSessionResponseSchema = z.object({
  data: z.object({
    session: InterviewSessionSchema,
    job: JobSchema,
    turns: z.array(TurnSchema),
    evaluation: EvaluationSchema.nullable(),
    decisionSignals: z.array(DecisionSignalSchema),
  }),
})

export const TranscribeRequestSchema = z.object({
  sessionId: IdSchema,
  mimeType: z.enum(['audio/webm', 'audio/mp4', 'audio/wav']),
  durationMs: z.number().int().min(0).max(120_000),
})
export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>

export const TranscribeResponseSchema = z.object({
  data: z.object({
    text: NonEmptyStringSchema,
    confidence: z.number().min(0).max(1).nullable(),
  }),
})

// ---------- LLM Output schemas ----------
export const NextQuestionOutputSchema = z.object({
  kind: QuestionKindSchema,
  question: NonEmptyStringSchema,
  rationale: z.string().min(1).max(800),
  sourceQuestionId: z.string().min(1).max(80).nullable(),
  signals: z.object({
    competencies: z.array(CompetencySignalSchema),
    topicsCovered: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  shouldEndInterview: z.boolean(),
})
export type NextQuestionOutput = z.infer<typeof NextQuestionOutputSchema>

export const EvaluationOutputSchema = EvaluationSchema.omit({
  id: true,
  sessionId: true,
  createdAt: true,
  rawModelOutput: true,
})
export type EvaluationOutput = z.infer<typeof EvaluationOutputSchema>

// ---------- Gate 4 — Session history + metrics ----------
export const SessionListItemSchema = z.object({
  id: IdSchema,
  jobSlug: z.string(),
  jobTitle: z.string(),
  status: SessionStatusSchema,
  questionsAsked: z.number().int().min(0),
  overallScore: z.number().int().min(0).max(100).nullable(),
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.nullable(),
})
export type SessionListItem = z.infer<typeof SessionListItemSchema>

export const ListSessionsQuerySchema = z.object({
  role: z.string().optional(),
  status: SessionStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
export const ListSessionsResponseSchema = z.object({
  data: z.object({
    sessions: z.array(SessionListItemSchema),
    totalCount: z.number().int().min(0),
  }),
})

export const SessionMetricsSchema = z.object({
  sessionId: IdSchema,
  durationMs: z.number().int().min(0),
  talkRatio: z.number().min(0).max(1),
  topicCoverage: z.number().min(0).max(1),
  overallScore: z.number().int().min(0).max(100).nullable(),
  scoreTrend: z.array(
    z.object({
      afterTurnIndex: z.number().int().min(1),
      competencyAverage: z.number().int().min(0).max(100),
    }),
  ),
})
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>

export const GetSessionMetricsResponseSchema = z.object({
  data: SessionMetricsSchema,
})
