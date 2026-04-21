import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from 'drizzle-orm/pg-core'

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    shortDescription: text('short_description').notNull(),
    longDescription: text('long_description').notNull(),
    level: text('level', { enum: ['junior', 'mid', 'senior', 'staff'] }).notNull(),
    competencies: jsonb('competencies').$type<string[]>().notNull(),
    questionPack: jsonb('question_pack')
      .$type<{ id: string; category: string; prompt: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('idx_jobs_slug').on(t.slug),
  }),
)

export const interviewSessions = pgTable(
  'interview_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id),
    softUserId: uuid('soft_user_id'),
    status: text('status', { enum: ['pending', 'in_progress', 'completed', 'abandoned'] }).notNull(),
    maxQuestions: integer('max_questions').notNull().default(6),
    questionsAsked: integer('questions_asked').notNull().default(0),
    followUpsAsked: integer('follow_ups_asked').notNull().default(0),
    videoEnabled: boolean('video_enabled').notNull().default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byJob: index('idx_sessions_job_id').on(t.jobId),
    byStatus: index('idx_sessions_status').on(t.status),
    byCreated: index('idx_sessions_created').on(t.createdAt),
    bySoftUser: index('idx_sessions_soft_user').on(t.softUserId, t.createdAt),
  }),
)

export const turns = pgTable(
  'turns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['interviewer', 'candidate'] }).notNull(),
    index: integer('index').notNull(),
    text: text('text').notNull(),
    questionKind: text('question_kind', { enum: ['opener', 'primary', 'follow_up', 'closer'] }),
    sttConfidence: real('stt_confidence'),
    audioUrl: text('audio_url'),
    sourceQuestionId: text('source_question_id'),
    spokenDurationMs: integer('spoken_duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionOrder: uniqueIndex('idx_turns_session_order').on(t.sessionId, t.index),
    roleShape: check(
      'turns_role_shape',
      sql`(${t.role} = 'interviewer' AND ${t.questionKind} IS NOT NULL AND ${t.sttConfidence} IS NULL AND ${t.spokenDurationMs} IS NULL)
          OR (${t.role} = 'candidate' AND ${t.questionKind} IS NULL AND ${t.sourceQuestionId} IS NULL)`,
    ),
  }),
)

export const decisionSignals = pgTable(
  'decision_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    afterTurnIndex: integer('after_turn_index').notNull(),
    competencies: jsonb('competencies').$type<unknown[]>().notNull(),
    topicsCovered: jsonb('topics_covered').$type<string[]>().notNull(),
    gaps: jsonb('gaps').$type<string[]>().notNull(),
    nextQuestionRationale: text('next_question_rationale').notNull(),
    nextQuestionKind: text('next_question_kind', {
      enum: ['opener', 'primary', 'follow_up', 'closer'],
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bySession: index('idx_signals_session').on(t.sessionId, t.afterTurnIndex),
  }),
)

export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .unique()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    overallScore: integer('overall_score').notNull(),
    summary: text('summary').notNull(),
    strengths: jsonb('strengths').$type<string[]>().notNull(),
    concerns: jsonb('concerns').$type<string[]>().notNull(),
    competencyScores: jsonb('competency_scores')
      .$type<{ competency: string; score: number; rationale: string }[]>()
      .notNull(),
    rawModelOutput: jsonb('raw_model_output').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scoreRange: check('evaluations_score_range', sql`${t.overallScore} BETWEEN 0 AND 100`),
  }),
)
