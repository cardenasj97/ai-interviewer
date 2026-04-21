import { apiFetch } from './client'
import type { Job, JobListItem } from '@/types/domain'

export function listJobs(): Promise<JobListItem[]> {
  return apiFetch<JobListItem[]>('/jobs')
}

export function getJob(slug: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${slug}`)
}
