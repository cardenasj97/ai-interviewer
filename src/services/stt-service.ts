import type { TranscribeRequest } from '@/types/domain'
import { AppError } from '@/types/errors'
import * as whisperClient from '@/adapters/whisper-client'
import * as sessionRepo from '@/db/session-repo'
import * as jobRepo from '@/db/job-repo'
import * as turnRepo from '@/db/turn-repo'
import { logger } from '@/utils/log'
import { normalize } from '@/utils/stt-normalize'

const MIN_DURATION_MS = 200
const MIN_BUFFER_BYTES = 1024
const MAX_PROMPT_CHARS = 800
const QUESTION_RESERVE = 300

const ROLE_VOCAB: Record<string, string[]> = {
  frontend: [
    'JSX', 'hooks', 'useState', 'useEffect', 'Zustand', 'Redux', 'React Query', 'React Router',
    'Jest', 'Cypress', 'Playwright', 'Lighthouse', 'bundle', 'webpack', 'Vite', 'lazy loading',
    'ARIA', 'WCAG', 'a11y', 'TTI', 'LCP', 'CLS', 'hydration', 'SSR', 'SSG', 'Tailwind',
  ],
  backend: [
    'PostgreSQL', 'MySQL', 'migration', 'index', 'foreign key', 'transaction', 'ORM', 'Prisma',
    'Redis', 'Kafka', 'RabbitMQ', 'gRPC', 'REST', 'GraphQL', 'OpenAPI', 'Swagger', 'JWT', 'OAuth',
    'CORS', 'rate limiting', 'idempotency', 'eventual consistency', 'distributed tracing',
    'Prometheus', 'Grafana', 'Datadog', 'Kubernetes', 'Docker', 'CI/CD', 'TDD', 'CRUD',
  ],
  pm: [
    'OKR', 'KPI', 'north star', 'A/B test', 'hypothesis', 'discovery', 'user interview',
    'Jobs to Be Done', 'JTBD', 'backlog', 'sprint', 'Scrum', 'Agile', 'Kanban', 'PRD', 'spec',
    'roadmap', 'dependency', 'churn', 'retention', 'conversion', 'DAU', 'MAU', 'ARPU', 'NPS',
    'MoM', 'YoY',
  ],
  data: [
    'SQL', 'window function', 'CTE', 'GROUP BY', 'subquery', 'pandas', 'NumPy', 'matplotlib',
    'seaborn', 'Tableau', 'Looker', 'BigQuery', 'Snowflake', 'dbt', 'p-value',
    'confidence interval', 'statistical significance', 'A/B test', 'cohort', 'funnel', 'retention',
    'churn', 'DAU', 'MAU', 'regression', 'correlation', 'outlier', 'ETL', 'pipeline', 'Airflow',
  ],
  designer: [
    'Figma', 'Sketch', 'InVision', 'wireframe', 'mockup', 'prototype', 'high-fidelity',
    'low-fidelity', 'design system', 'component library', 'WCAG', 'accessibility', 'ARIA',
    'user research', 'usability testing', 'affinity map', 'journey map', 'persona',
    'interaction design', 'micro-interaction', 'Gestalt', 'typography', 'color theory',
    'responsive', 'mobile-first',
  ],
}

function detectRole(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('frontend') || t.includes('front-end') || t.includes('front end') || t.includes(' ui ') || t.endsWith(' ui')) return 'frontend'
  if (t.includes('backend') || t.includes('back-end') || t.includes('back end') || t.includes('server')) return 'backend'
  if (t.includes('product manager') || t.includes(' pm') || t.startsWith('pm ') || t === 'pm') return 'pm'
  if (t.includes('data') || t.includes('analyst') || t.includes('analytics')) return 'data'
  if (t.includes('design') || t.includes('ux') || t.includes('ui/ux')) return 'designer'
  return 'backend'
}

export function buildBiasPromptSync(opts: {
  title: string
  competencies: string[]
  lastQuestion: string | null
}): string {
  const { title, competencies, lastQuestion } = opts
  const role = detectRole(title)
  const vocab = ROLE_VOCAB[role] ?? ROLE_VOCAB['backend'] ?? []

  const VOCAB_BUDGET = MAX_PROMPT_CHARS - QUESTION_RESERVE
  let body = `This is a technical interview for a ${title} position. Topics: ${competencies.join(', ')}. Key terms: ${vocab.join(', ')}.`
  if (body.length > VOCAB_BUDGET) {
    const cut = body.lastIndexOf(' ', VOCAB_BUDGET)
    body = body.slice(0, cut > 0 ? cut : VOCAB_BUDGET)
  }

  const questionPart = lastQuestion ? ` Interviewer: ${lastQuestion}` : ''
  return (body + questionPart).slice(0, MAX_PROMPT_CHARS)
}

export async function buildBiasPrompt(sessionId: string): Promise<string | undefined> {
  try {
    const session = await sessionRepo.getSessionById(sessionId)
    const job = await jobRepo.getJobById(session.jobId)
    const lastTurn = await turnRepo.getLastTurn(sessionId)
    const lastQuestion =
      lastTurn && lastTurn.role === 'interviewer' ? lastTurn.text : null

    return buildBiasPromptSync({ title: job.title, competencies: job.competencies, lastQuestion })
  } catch (err) {
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

  const result = await whisperClient.transcribe({ audio, mimeType: meta.mimeType, prompt })
  return { ...result, text: normalize(result.text) }
}
