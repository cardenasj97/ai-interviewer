import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { MetricsSummary } from '@/types/domain'
import { AppError } from '@/types/errors'

vi.mock('@/db/history-repo', () => ({
  listCompletedSessions: vi.fn(),
  getMetricsSummary: vi.fn(),
}))

import { createApp } from '@/index'
import * as historyRepo from '@/db/history-repo'

const COOKIE = 'interview_session_id=aaaa-1111'

const emptyMetrics: MetricsSummary = {
  totalSessions: 0,
  completedSessions: 0,
  abandonedSessions: 0,
  avgOverallScore: null,
  competencyAverages: [],
  scoreTrend: [],
}

const populatedMetrics: MetricsSummary = {
  totalSessions: 5,
  completedSessions: 3,
  abandonedSessions: 2,
  avgOverallScore: 74.5,
  competencyAverages: [
    { competency: 'React', avgScore: 82, sampleCount: 3 },
    { competency: 'TypeScript', avgScore: 68, sampleCount: 3 },
  ],
  scoreTrend: [
    { completedAt: '2026-04-21T10:00:00.000Z', overallScore: 65 },
    { completedAt: '2026-04-21T11:00:00.000Z', overallScore: 78 },
    { completedAt: '2026-04-21T12:00:00.000Z', overallScore: 80 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/metrics', () => {
  it('returns empty/zero state when no sessions exist', async () => {
    vi.mocked(historyRepo.getMetricsSummary).mockResolvedValue(emptyMetrics)

    const app = createApp()
    const res = await request(app).get('/api/v1/metrics').set('Cookie', COOKIE)

    expect(res.status).toBe(200)
    expect(res.body.data.totalSessions).toBe(0)
    expect(res.body.data.completedSessions).toBe(0)
    expect(res.body.data.abandonedSessions).toBe(0)
    expect(res.body.data.avgOverallScore).toBeNull()
    expect(res.body.data.competencyAverages).toEqual([])
    expect(res.body.data.scoreTrend).toEqual([])
  })

  it('returns populated metrics in correct shape', async () => {
    vi.mocked(historyRepo.getMetricsSummary).mockResolvedValue(populatedMetrics)

    const app = createApp()
    const res = await request(app).get('/api/v1/metrics').set('Cookie', COOKIE)

    expect(res.status).toBe(200)
    const data = res.body.data
    expect(data.totalSessions).toBe(5)
    expect(data.completedSessions).toBe(3)
    expect(data.abandonedSessions).toBe(2)
    expect(data.avgOverallScore).toBeCloseTo(74.5)
    expect(data.competencyAverages).toHaveLength(2)
    expect(data.competencyAverages[0]).toEqual({ competency: 'React', avgScore: 82, sampleCount: 3 })
    expect(data.scoreTrend).toHaveLength(3)
    expect(data.scoreTrend[0].overallScore).toBe(65)
  })

  it('returns empty metrics when no cookie is present', async () => {
    vi.mocked(historyRepo.getMetricsSummary).mockResolvedValue(emptyMetrics)

    const app = createApp()
    const res = await request(app).get('/api/v1/metrics')

    expect(res.status).toBe(200)
    expect(res.body.data.totalSessions).toBe(0)
    // Called with empty array when no cookie
    expect(vi.mocked(historyRepo.getMetricsSummary)).toHaveBeenCalledWith([])
  })

  it('correctly handles mixed completed + abandoned in totals', async () => {
    const mixed: MetricsSummary = {
      totalSessions: 10,
      completedSessions: 6,
      abandonedSessions: 4,
      avgOverallScore: 71.0,
      competencyAverages: [],
      scoreTrend: [],
    }
    vi.mocked(historyRepo.getMetricsSummary).mockResolvedValue(mixed)

    const app = createApp()
    const res = await request(app).get('/api/v1/metrics').set('Cookie', COOKIE)

    expect(res.body.data.completedSessions + res.body.data.abandonedSessions).toBe(10)
  })

  it('returns 500 on repo failure', async () => {
    vi.mocked(historyRepo.getMetricsSummary).mockRejectedValue(
      new AppError('INTERNAL_ERROR', 'DB failed', 500),
    )

    const app = createApp()
    const res = await request(app).get('/api/v1/metrics').set('Cookie', COOKIE)
    expect(res.status).toBe(500)
  })
})
