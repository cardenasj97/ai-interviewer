import { db, closeDb } from '@/db/client'
import { jobs } from '@/db/schema'
import { seedJobs } from './jobs'
import { logger } from '@/utils/log'

export async function seed(): Promise<void> {
  logger.info({ count: seedJobs.length }, 'seeding jobs')
  await db.insert(jobs).values(seedJobs).onConflictDoNothing({ target: jobs.slug })
  logger.info('seed complete')
}

const isDirectRun =
  process.argv[1]?.endsWith('seeds/index.ts') || process.argv[1]?.endsWith('seeds/index.js')
if (isDirectRun) {
  seed()
    .then(() => closeDb())
    .catch((err) => {
      logger.error({ err }, 'seed failed')
      process.exit(1)
    })
}
