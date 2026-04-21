import { apiFetch } from './client'
import type { SessionHistoryItem } from '@/types/domain'

export function listHistory(
  params: { jobSlug?: string; limit?: number; cursor?: string } = {},
): Promise<SessionHistoryItem[]> {
  const query = new URLSearchParams()
  if (params.jobSlug) query.set('jobSlug', params.jobSlug)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.cursor) query.set('cursor', params.cursor)
  const qs = query.toString()
  return apiFetch(`/history${qs ? `?${qs}` : ''}`)
}
