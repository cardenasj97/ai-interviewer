import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db/session-repo', () => ({ getSessionById: vi.fn() }))
vi.mock('@/db/job-repo', () => ({ getJobById: vi.fn() }))
vi.mock('@/db/turn-repo', () => ({ getLastTurn: vi.fn() }))
vi.mock('@/adapters/whisper-client', () => ({ transcribe: vi.fn() }))

import { buildBiasPromptSync } from '@/services/stt-service'
import * as whisperClient from '@/adapters/whisper-client'
import * as sessionRepo from '@/db/session-repo'
import * as jobRepo from '@/db/job-repo'
import * as turnRepo from '@/db/turn-repo'
import { transcribe } from '@/services/stt-service'

describe('buildBiasPromptSync', () => {
  it('starts with natural prose sentence', () => {
    const result = buildBiasPromptSync({
      title: 'Frontend Engineer',
      competencies: ['React', 'TypeScript'],
      lastQuestion: null,
    })
    expect(result).toMatch(/^This is a technical interview for a Frontend Engineer position\./)
  })

  it('PM role does not contain React or Kubernetes', () => {
    const result = buildBiasPromptSync({
      title: 'Product Manager',
      competencies: ['Strategy', 'Roadmapping'],
      lastQuestion: null,
    })
    expect(result).not.toContain('React')
    expect(result).not.toContain('Kubernetes')
    expect(result).toContain('OKR')
  })

  it('never exceeds MAX_PROMPT_CHARS (800)', () => {
    const longQuestion = 'Q'.repeat(300)
    const result = buildBiasPromptSync({
      title: 'Backend Engineer',
      competencies: Array.from({ length: 20 }, (_, i) => `Competency${i}`),
      lastQuestion: longQuestion,
    })
    expect(result.length).toBeLessThanOrEqual(800)
  })

  it('question is never truncated mid-word when body is at max', () => {
    const question = 'Tell me about your experience with PostgreSQL.'
    const result = buildBiasPromptSync({
      title: 'Backend Engineer',
      competencies: Array.from({ length: 20 }, (_, i) => `Competency${i}`),
      lastQuestion: question,
    })
    // If question appears, it must appear complete
    if (result.includes('Interviewer:')) {
      expect(result).toContain(question)
    }
  })

  it('includes the last question in natural prose', () => {
    const result = buildBiasPromptSync({
      title: 'Frontend Engineer',
      competencies: ['React'],
      lastQuestion: 'How do you handle state management?',
    })
    expect(result).toContain('Interviewer: How do you handle state management?')
  })

  it('detects data role by title', () => {
    const result = buildBiasPromptSync({
      title: 'Data Analyst',
      competencies: ['SQL'],
      lastQuestion: null,
    })
    expect(result).toContain('ETL')
    expect(result).not.toContain('Kubernetes')
  })

  it('detects designer role by title', () => {
    const result = buildBiasPromptSync({
      title: 'UX Designer',
      competencies: ['Figma'],
      lastQuestion: null,
    })
    expect(result).toContain('Figma')
    expect(result).not.toContain('Redux')
  })
})

describe('transcribe (stt-service) — Whisper call args', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sessionRepo.getSessionById).mockResolvedValue({
      id: 'sess-id',
      jobId: 'job-id',
      softUserId: null,
      status: 'in_progress',
      maxQuestions: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never)
    vi.mocked(jobRepo.getJobById).mockResolvedValue({
      id: 'job-id',
      slug: 'frontend-engineer',
      title: 'Frontend Engineer',
      shortDescription: 'desc',
      longDescription: 'long desc',
      level: 'mid',
      competencies: ['React', 'TypeScript'],
      questionPack: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never)
    vi.mocked(turnRepo.getLastTurn).mockResolvedValue(null)
    vi.mocked(whisperClient.transcribe).mockResolvedValue({ text: 'hello world', confidence: null })
  })

  it('calls whisperClient.transcribe with a prompt', async () => {
    const audio = Buffer.alloc(2048, 0x00)
    await transcribe({
      audio,
      meta: { sessionId: 'sess-id', mimeType: 'audio/webm', durationMs: 5000 },
    })
    expect(whisperClient.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.any(String) }),
    )
  })

  it('applies normalization to the returned text', async () => {
    vi.mocked(whisperClient.transcribe).mockResolvedValue({ text: 'I used oath and crud', confidence: null })
    const audio = Buffer.alloc(2048, 0x00)
    const result = await transcribe({
      audio,
      meta: { sessionId: 'sess-id', mimeType: 'audio/webm', durationMs: 5000 },
    })
    expect(result.text).toBe('I used OAuth and CRUD')
  })
})
