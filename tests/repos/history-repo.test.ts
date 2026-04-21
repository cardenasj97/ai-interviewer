import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db.execute before importing the repo
vi.mock('@/db/client', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/db/client'
import { listCompletedSessions, getMetricsSummary } from '@/db/history-repo'

const mockExecute = vi.mocked(db.execute)

beforeEach(() => {
  vi.clearAllMocks()
})

// --------------- listCompletedSessions ---------------

describe('listCompletedSessions', () => {
  it('returns empty immediately when cookieSessionIds is empty array', async () => {
    const result = await listCompletedSessions({ limit: 20, cookieSessionIds: [] })
    expect(result).toEqual({ items: [], nextCursor: null })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns empty when DB returns no rows', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] } as never)
    const result = await listCompletedSessions({ limit: 20 })
    expect(result).toEqual({ items: [], nextCursor: null })
  })

  it('maps a single completed row correctly', async () => {
    const completedAt = new Date('2026-04-21T12:00:00.000Z')
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: 'aaaa-1111',
          jobTitle: 'Frontend Engineer',
          jobSlug: 'frontend-engineer',
          completedAt,
          durationSeconds: 840,
          questionCount: 6,
          overallScore: 78,
        },
      ],
    } as never)

    const result = await listCompletedSessions({ limit: 20 })

    expect(result.nextCursor).toBeNull()
    expect(result.items).toHaveLength(1)
    const item = result.items[0]!
    expect(item.id).toBe('aaaa-1111')
    expect(item.jobTitle).toBe('Frontend Engineer')
    expect(item.durationSeconds).toBe(840)
    expect(item.questionCount).toBe(6)
    expect(item.overallScore).toBe(78)
    expect(item.decisionSignal).toBe('hire')
    expect(item.completedAt).toBe('2026-04-21T12:00:00.000Z')
  })

  it('derives decisionSignal correctly from overallScore', async () => {
    const makeRow = (overallScore: number | null) => ({
      id: 'x',
      jobTitle: 'T',
      jobSlug: 's',
      completedAt: new Date(),
      durationSeconds: 0,
      questionCount: 6,
      overallScore,
    })

    const cases: Array<{ score: number | null; expected: string | null }> = [
      { score: null, expected: null },
      { score: 39, expected: 'strong_no_hire' },
      { score: 40, expected: 'no_hire' },
      { score: 64, expected: 'no_hire' },
      { score: 65, expected: 'hire' },
      { score: 79, expected: 'hire' },
      { score: 80, expected: 'strong_hire' },
      { score: 100, expected: 'strong_hire' },
    ]

    for (const { score, expected } of cases) {
      mockExecute.mockResolvedValueOnce({ rows: [makeRow(score)] } as never)
      const { items } = await listCompletedSessions({ limit: 20 })
      expect(items[0]?.decisionSignal).toBe(expected)
    }
  })

  it('returns nextCursor when there are more pages', async () => {
    const completedAt = new Date('2026-04-21T12:00:00.000Z')
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `id-${i}`,
      jobTitle: 'Engineer',
      jobSlug: 'engineer',
      completedAt,
      durationSeconds: 600,
      questionCount: 6,
      overallScore: 75,
    }))

    mockExecute.mockResolvedValueOnce({ rows } as never)

    const result = await listCompletedSessions({ limit: 20 })

    expect(result.items).toHaveLength(20)
    expect(result.nextCursor).not.toBeNull()
    // cursor decodes to the completedAt ISO string of the last returned item
    const decoded = Buffer.from(result.nextCursor!, 'base64').toString('utf8')
    expect(decoded).toBe(completedAt.toISOString())
  })

  it('returns no nextCursor when results fit in one page', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: 'a',
          jobTitle: 'T',
          jobSlug: 's',
          completedAt: new Date(),
          durationSeconds: 300,
          questionCount: 6,
          overallScore: null,
        },
      ],
    } as never)

    const result = await listCompletedSessions({ limit: 20 })
    expect(result.nextCursor).toBeNull()
    expect(result.items[0]?.overallScore).toBeNull()
    expect(result.items[0]?.decisionSignal).toBeNull()
  })
})

// --------------- getMetricsSummary ---------------

describe('getMetricsSummary', () => {
  it('returns zeros immediately when cookieSessionIds is empty array', async () => {
    const result = await getMetricsSummary([])
    expect(result).toEqual({
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
      avgOverallScore: null,
      competencyAverages: [],
      scoreTrend: [],
    })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns correct aggregates for populated data', async () => {
    // Three execute calls: counts, competency averages, score trend
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          {
            totalSessions: '5',
            completedSessions: '3',
            abandonedSessions: '2',
            avgOverallScore: '72.5',
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          { competency: 'React', avgScore: '80', sampleCount: '3' },
          { competency: 'TypeScript', avgScore: '70', sampleCount: '3' },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          { completedAt: new Date('2026-04-21T10:00:00.000Z'), overallScore: 65 },
          { completedAt: new Date('2026-04-21T11:00:00.000Z'), overallScore: 78 },
          { completedAt: new Date('2026-04-21T12:00:00.000Z'), overallScore: 85 },
        ],
      } as never)

    const result = await getMetricsSummary()

    expect(result.totalSessions).toBe(5)
    expect(result.completedSessions).toBe(3)
    expect(result.abandonedSessions).toBe(2)
    expect(result.avgOverallScore).toBeCloseTo(72.5)
    expect(result.competencyAverages).toHaveLength(2)
    expect(result.competencyAverages[0]).toEqual({ competency: 'React', avgScore: 80, sampleCount: 3 })
    expect(result.scoreTrend).toHaveLength(3)
    expect(result.scoreTrend[0]).toEqual({
      completedAt: '2026-04-21T10:00:00.000Z',
      overallScore: 65,
    })
  })

  it('returns null avgOverallScore when no completed sessions', async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          {
            totalSessions: '2',
            completedSessions: '0',
            abandonedSessions: '2',
            avgOverallScore: null,
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)

    const result = await getMetricsSummary()

    expect(result.avgOverallScore).toBeNull()
    expect(result.competencyAverages).toEqual([])
    expect(result.scoreTrend).toEqual([])
  })
})
