import type { Job, JobListItem } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function listJobs(): Promise<JobListItem[]> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function getJobBySlug(_slug: string): Promise<Job> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function getJobById(_id: string): Promise<Job> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
