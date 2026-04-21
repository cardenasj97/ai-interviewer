import { apiFetch } from './client'
import type { Job, JobListItem } from '@/types/domain'

export type QuestionPack = Job['questionPack']
export type JobListItemWithPack = JobListItem & { questionPack?: QuestionPack }

export function listJobs(): Promise<JobListItemWithPack[]> {
  return apiFetch<JobListItemWithPack[]>('/jobs')
}

export function getJob(slug: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${slug}`)
}
