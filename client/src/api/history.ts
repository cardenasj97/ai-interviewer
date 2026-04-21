import { apiFetch } from './client'
import type { SessionListItem } from '@/types/domain'

export interface ListHistoryParams {
  role?: string
  limit?: number
  offset?: number
}

export interface SessionHistoryResponse {
  sessions: SessionListItem[]
  totalCount: number
}

export function listHistory(params: ListHistoryParams = {}): Promise<SessionHistoryResponse> {
  const query = new URLSearchParams()
  if (params.role) query.set('role', params.role)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))
  const qs = query.toString()
  return apiFetch(`/history${qs ? `?${qs}` : ''}`)
}
