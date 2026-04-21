import type { MetricsSummary, SessionHistoryItem } from '@/types/domain'

const day = 24 * 60 * 60 * 1000
const now = Date.now()
const ago = (days: number) => new Date(now - days * day).toISOString()

export type MockSessionHistoryItem = SessionHistoryItem & { isMock: true }

export const MOCK_HISTORY: MockSessionHistoryItem[] = [
  {
    id: 'mock-a1111111-1111-4111-8111-111111111111',
    jobSlug: 'frontend-engineer',
    jobTitle: 'Frontend Engineer',
    completedAt: ago(13),
    durationSeconds: 22 * 60,
    questionCount: 6,
    overallScore: 62,
    decisionSignal: 'no_hire',
    isMock: true,
  },
  {
    id: 'mock-a2222222-2222-4222-8222-222222222222',
    jobSlug: 'frontend-engineer',
    jobTitle: 'Frontend Engineer',
    completedAt: ago(9),
    durationSeconds: 28 * 60,
    questionCount: 6,
    overallScore: 78,
    decisionSignal: 'hire',
    isMock: true,
  },
  {
    id: 'mock-a3333333-3333-4333-8333-333333333333',
    jobSlug: 'frontend-engineer',
    jobTitle: 'Frontend Engineer',
    completedAt: ago(4),
    durationSeconds: 31 * 60,
    questionCount: 6,
    overallScore: 88,
    decisionSignal: 'strong_hire',
    isMock: true,
  },
  {
    id: 'mock-b1111111-1111-4111-8111-111111111111',
    jobSlug: 'backend-engineer',
    jobTitle: 'Backend Engineer',
    completedAt: ago(11),
    durationSeconds: 35 * 60,
    questionCount: 7,
    overallScore: 71,
    decisionSignal: 'hire',
    isMock: true,
  },
  {
    id: 'mock-b2222222-2222-4222-8222-222222222222',
    jobSlug: 'backend-engineer',
    jobTitle: 'Backend Engineer',
    completedAt: ago(2),
    durationSeconds: 29 * 60,
    questionCount: 6,
    overallScore: 84,
    decisionSignal: 'strong_hire',
    isMock: true,
  },
]

export const MOCK_METRICS: MetricsSummary = {
  totalSessions: MOCK_HISTORY.length,
  completedSessions: MOCK_HISTORY.length,
  abandonedSessions: 1,
  avgOverallScore: Math.round(
    MOCK_HISTORY.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / MOCK_HISTORY.length,
  ),
  competencyAverages: [
    { competency: 'React', avgScore: 82, sampleCount: 3 },
    { competency: 'TypeScript', avgScore: 78, sampleCount: 3 },
    { competency: 'Accessibility (a11y)', avgScore: 68, sampleCount: 3 },
    { competency: 'Performance', avgScore: 73, sampleCount: 3 },
    { competency: 'API design', avgScore: 82, sampleCount: 2 },
    { competency: 'Databases & SQL', avgScore: 82, sampleCount: 2 },
    { competency: 'Distributed systems', avgScore: 71, sampleCount: 2 },
    { competency: 'Security', avgScore: 88, sampleCount: 1 },
  ],
  scoreTrend: [...MOCK_HISTORY]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((s) => ({ completedAt: s.completedAt, overallScore: s.overallScore ?? 0 })),
}

export function mergeHistory(real: SessionHistoryItem[]): SessionHistoryItem[] {
  return [...real, ...MOCK_HISTORY].sort((a, b) => b.completedAt.localeCompare(a.completedAt))
}

export function mergeMetrics(real: MetricsSummary): MetricsSummary {
  const totalSessions = real.totalSessions + MOCK_METRICS.totalSessions
  const completedSessions = real.completedSessions + MOCK_METRICS.completedSessions
  const abandonedSessions = real.abandonedSessions + MOCK_METRICS.abandonedSessions

  const realCompleted = real.completedSessions
  const mockCompleted = MOCK_METRICS.completedSessions
  const denom = realCompleted + mockCompleted
  const avgOverallScore =
    denom === 0
      ? null
      : Math.round(
          ((real.avgOverallScore ?? 0) * realCompleted +
            (MOCK_METRICS.avgOverallScore ?? 0) * mockCompleted) /
            denom,
        )

  const compMap = new Map<string, { sum: number; count: number }>()
  for (const c of [...real.competencyAverages, ...MOCK_METRICS.competencyAverages]) {
    const prev = compMap.get(c.competency) ?? { sum: 0, count: 0 }
    compMap.set(c.competency, {
      sum: prev.sum + c.avgScore * c.sampleCount,
      count: prev.count + c.sampleCount,
    })
  }
  const competencyAverages = Array.from(compMap.entries())
    .map(([competency, { sum, count }]) => ({
      competency,
      avgScore: count === 0 ? 0 : Math.round(sum / count),
      sampleCount: count,
    }))
    .sort((a, b) => a.competency.localeCompare(b.competency))

  const scoreTrend = [...real.scoreTrend, ...MOCK_METRICS.scoreTrend].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  )

  return {
    totalSessions,
    completedSessions,
    abandonedSessions,
    avgOverallScore,
    competencyAverages,
    scoreTrend,
  }
}
