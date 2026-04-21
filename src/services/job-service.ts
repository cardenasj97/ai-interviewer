import type { Job, JobListItem } from '@/types/domain'
import * as jobRepo from '@/db/job-repo'

export async function listJobs(): Promise<JobListItem[]> {
  return jobRepo.listJobs()
}

export async function getJob(slug: string): Promise<Job> {
  return jobRepo.getJobBySlug(slug)
}
