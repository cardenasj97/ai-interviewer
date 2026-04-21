import { eq } from 'drizzle-orm'
import { db } from './client'
import { jobs } from './schema'
import type { Job, JobListItem } from '@/types/domain'
import { AppError } from '@/types/errors'

function toIso(d: Date): string {
  return d.toISOString()
}

function rowToJob(row: typeof jobs.$inferSelect): Job {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    level: row.level,
    competencies: row.competencies,
    questionPack: row.questionPack as Job['questionPack'],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function rowToJobListItem(row: typeof jobs.$inferSelect): JobListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    level: row.level,
    questionPack: row.questionPack as JobListItem['questionPack'],
  }
}

export async function listJobs(): Promise<JobListItem[]> {
  const rows = await db.select().from(jobs)
  return rows.map(rowToJobListItem)
}

export async function getJobBySlug(slug: string): Promise<Job> {
  const [row] = await db.select().from(jobs).where(eq(jobs.slug, slug))
  if (!row) throw new AppError('JOB_NOT_FOUND', `Job not found: ${slug}`, 404)
  return rowToJob(row)
}

export async function getJobById(id: string): Promise<Job> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id))
  if (!row) throw new AppError('JOB_NOT_FOUND', `Job not found: ${id}`, 404)
  return rowToJob(row)
}
