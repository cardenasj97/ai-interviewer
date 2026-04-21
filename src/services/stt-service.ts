import type { TranscribeRequest } from '@/types/domain'
import { AppError } from '@/types/errors'
import * as whisperClient from '@/adapters/whisper-client'
import * as sessionRepo from '@/db/session-repo'
import * as jobRepo from '@/db/job-repo'
import * as turnRepo from '@/db/turn-repo'
import { logger } from '@/utils/log'

const MIN_DURATION_MS = 200
const MIN_BUFFER_BYTES = 1024
const MAX_PROMPT_CHARS = 800 // Whisper accepts ~224 tokens (~900 chars); stay safely under

// Generic technical vocabulary — keeps everyday engineering nouns biased even when
// the job's competency list doesn't enumerate them explicitly.
const BASE_VOCAB = [
  'TypeScript', 'JavaScript', 'React', 'Node.js', 'Express', 'Vite', 'Tailwind',
  'PostgreSQL', 'Drizzle', 'Zod', 'Vitest', 'JSON', 'REST', 'GraphQL',
  'OAuth', 'JWT', 'Kubernetes', 'Docker', 'CI/CD', 'API', 'SDK', 'CLI',
  'SQL', 'NoSQL', 'Redis', 'CRUD', 'TDD', 'CORS', 'WebSocket',
]

export async function buildBiasPrompt(sessionId: string): Promise<string | undefined> {
  try {
    const session = await sessionRepo.getSessionById(sessionId)
    const job = await jobRepo.getJobById(session.jobId)
    const lastTurn = await turnRepo.getLastTurn(sessionId)
    const lastQuestion =
      lastTurn && lastTurn.role === 'interviewer' ? lastTurn.text : null

    const parts: string[] = []
    parts.push(`Job: ${job.title}.`)
    if (job.competencies.length > 0) {
      parts.push(`Competencies: ${job.competencies.join(', ')}.`)
    }
    parts.push(`Vocabulary: ${BASE_VOCAB.join(', ')}.`)
    if (lastQuestion) {
      parts.push(`Interviewer asked: ${lastQuestion}`)
    }

    let prompt = parts.join(' ')
    if (prompt.length > MAX_PROMPT_CHARS) {
      prompt = prompt.slice(0, MAX_PROMPT_CHARS)
    }
    return prompt
  } catch (err) {
    // Bias prompt is best-effort; never fail STT because we couldn't build one.
    logger.warn({ err, sessionId }, 'failed to build STT bias prompt; falling back to no prompt')
    return undefined
  }
}

export async function transcribe(input: {
  audio: Buffer
  meta: TranscribeRequest
}): Promise<{ text: string; confidence: number | null }> {
  const { audio, meta } = input

  if (meta.durationMs < MIN_DURATION_MS || audio.length < MIN_BUFFER_BYTES) {
    throw new AppError('AUDIO_EMPTY', 'Audio clip is too short or empty', 422)
  }

  const prompt = await buildBiasPrompt(meta.sessionId)

  return whisperClient.transcribe({ audio, mimeType: meta.mimeType, prompt })
}
