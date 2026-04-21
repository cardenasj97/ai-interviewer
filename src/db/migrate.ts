import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import path from 'node:path'
import { db, closeDb } from './client'
import { logger } from '@/utils/log'

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle')
  logger.info({ migrationsFolder }, 'running migrations')
  await migrate(db, { migrationsFolder })
  logger.info('migrations complete')
}

const isDirectRun = process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')
if (isDirectRun) {
  runMigrations()
    .then(() => closeDb())
    .catch((err) => {
      logger.error({ err }, 'migration failed')
      process.exit(1)
    })
}
