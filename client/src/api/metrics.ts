import { apiFetch } from './client'

export interface AggregateMetrics {
  totalSessions: number
  completedSessions: number
  abandonedSessions: number
  avgOverallScore: number | null
  competencyAverages: Array<{ competency: string; avgScore: number }>
  scoreTrend: Array<{ date: string; avgScore: number }>
}

export function getMetrics(): Promise<AggregateMetrics> {
  return apiFetch('/metrics')
}
