import { apiFetch } from './client'
import type { MetricsSummary } from '@/types/domain'

export function getMetrics(): Promise<MetricsSummary> {
  return apiFetch('/metrics')
}
