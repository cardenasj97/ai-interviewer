import { sql } from 'drizzle-orm'
import { db } from './client'
import type { MetricsSummary, SessionHistoryItem } from '@/types/domain'
import { AppError } from '@/types/errors'

function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : d
}

// Derives a hire decision from an evaluation's overall score (0–100).
// No stored enum exists — we compute it on the fly.
function deriveDecisionSignal(
  score: number | null,
): SessionHistoryItem['decisionSignal'] {
  if (score === null) return null
  if (score >= 80) return 'strong_hire'
  if (score >= 65) return 'hire'
  if (score >= 40) return 'no_hire'
  return 'strong_no_hire'
}

type ListParams = {
  jobSlug?: string
  limit: number
  cursor?: string
  cookieSessionIds?: string[]
}

export async function listCompletedSessions(
  params: ListParams,
): Promise<{ items: SessionHistoryItem[]; nextCursor: string | null }> {
  const { jobSlug, limit, cursor, cookieSessionIds } = params

  if (cookieSessionIds !== undefined && cookieSessionIds.length === 0) {
    return { items: [], nextCursor: null }
  }

  const cursorDate = cursor ? new Date(Buffer.from(cursor, 'base64').toString('utf8')) : null

  try {
    // Build dynamic WHERE fragments
    const cookieFilter =
      cookieSessionIds !== undefined
        ? sql` AND s.id = ANY(ARRAY[${sql.join(cookieSessionIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
        : sql``
    const slugFilter = jobSlug ? sql` AND j.slug = ${jobSlug}` : sql``
    const cursorFilter = cursorDate ? sql` AND s.ended_at < ${cursorDate}` : sql``

    type HistoryRow = {
      id: string
      jobTitle: string
      jobSlug: string
      completedAt: Date | string
      durationSeconds: string | number
      questionCount: string | number
      overallScore: number | null
    }

    const result = await db.execute<HistoryRow>(sql`
      SELECT
        s.id,
        j.title AS "jobTitle",
        j.slug  AS "jobSlug",
        s.ended_at AS "completedAt",
        GREATEST(0, EXTRACT(EPOCH FROM (s.ended_at - s.created_at)))::integer AS "durationSeconds",
        COALESCE(
          (SELECT COUNT(*)::integer
             FROM turns t
            WHERE t.session_id = s.id
              AND t.role = 'interviewer'),
          0
        )::integer AS "questionCount",
        e.overall_score AS "overallScore"
      FROM interview_sessions s
      JOIN jobs j ON j.id = s.job_id
      LEFT JOIN evaluations e ON e.session_id = s.id
      WHERE s.status = 'completed'
        ${cookieFilter}
        ${slugFilter}
        ${cursorFilter}
      ORDER BY s.ended_at DESC
      LIMIT ${limit + 1}
    `)

    const rows = result.rows
    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows

    const items: SessionHistoryItem[] = pageRows.map((row) => ({
      id: row.id,
      jobTitle: row.jobTitle,
      jobSlug: row.jobSlug,
      completedAt: toIso(row.completedAt),
      durationSeconds: Number(row.durationSeconds),
      questionCount: Number(row.questionCount),
      overallScore: row.overallScore ?? null,
      decisionSignal: deriveDecisionSignal(row.overallScore ?? null),
    }))

    let nextCursor: string | null = null
    if (hasMore && pageRows.length > 0) {
      const lastRow = pageRows[pageRows.length - 1]
      if (lastRow) {
        nextCursor = Buffer.from(toIso(lastRow.completedAt)).toString('base64')
      }
    }

    return { items, nextCursor }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError('INTERNAL_ERROR', 'Failed to list history', 500, err)
  }
}

export async function getMetricsSummary(
  cookieSessionIds?: string[],
): Promise<MetricsSummary> {
  if (cookieSessionIds !== undefined && cookieSessionIds.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
      avgOverallScore: null,
      competencyAverages: [],
      scoreTrend: [],
    }
  }

  const cookieFilter =
    cookieSessionIds !== undefined
      ? sql` AND s.id = ANY(ARRAY[${sql.join(cookieSessionIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      : sql``

  try {
    type CountRow = {
      totalSessions: string | number
      completedSessions: string | number
      abandonedSessions: string | number
      avgOverallScore: string | number | null
    }

    const countsResult = await db.execute<CountRow>(sql`
      SELECT
        COUNT(*)::integer                                                       AS "totalSessions",
        COUNT(*) FILTER (WHERE s.status = 'completed')::integer                AS "completedSessions",
        COUNT(*) FILTER (WHERE s.status = 'abandoned')::integer                AS "abandonedSessions",
        AVG(e.overall_score)                                                    AS "avgOverallScore"
      FROM interview_sessions s
      LEFT JOIN evaluations e ON e.session_id = s.id
      WHERE 1=1
        ${cookieFilter}
    `)

    const countsRow = countsResult.rows[0] ?? {
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
      avgOverallScore: null,
    }

    type CompetencyRow = {
      competency: string
      avgScore: string | number
      sampleCount: string | number
    }

    // competencyScores is stored as jsonb: [{ competency, score, rationale }]
    const compResult = await db.execute<CompetencyRow>(sql`
      SELECT
        cs->>'competency'                AS competency,
        AVG((cs->>'score')::numeric)     AS "avgScore",
        COUNT(*)::integer                AS "sampleCount"
      FROM interview_sessions s
      JOIN evaluations e ON e.session_id = s.id
      CROSS JOIN LATERAL jsonb_array_elements(e.competency_scores::jsonb) AS cs
      WHERE s.status = 'completed'
        ${cookieFilter}
      GROUP BY cs->>'competency'
      ORDER BY cs->>'competency'
    `)

    type TrendRow = {
      completedAt: Date | string
      overallScore: number
    }

    const trendResult = await db.execute<TrendRow>(sql`
      SELECT
        s.ended_at        AS "completedAt",
        e.overall_score   AS "overallScore"
      FROM interview_sessions s
      JOIN evaluations e ON e.session_id = s.id
      WHERE s.status = 'completed'
        ${cookieFilter}
      ORDER BY s.ended_at ASC
      LIMIT 20
    `)

    return {
      totalSessions: Number(countsRow.totalSessions),
      completedSessions: Number(countsRow.completedSessions),
      abandonedSessions: Number(countsRow.abandonedSessions),
      avgOverallScore:
        countsRow.avgOverallScore !== null && countsRow.avgOverallScore !== undefined
          ? Number(countsRow.avgOverallScore)
          : null,
      competencyAverages: compResult.rows.map((row) => ({
        competency: row.competency,
        avgScore: Number(row.avgScore),
        sampleCount: Number(row.sampleCount),
      })),
      scoreTrend: trendResult.rows.map((row) => ({
        completedAt: toIso(row.completedAt),
        overallScore: Number(row.overallScore),
      })),
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError('INTERNAL_ERROR', 'Failed to compute metrics', 500, err)
  }
}
