export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'JOB_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_ALREADY_COMPLETED'
  | 'SESSION_ABANDONED'
  | 'TURN_OUT_OF_ORDER'
  | 'EVALUATION_ALREADY_EXISTS'
  | 'AUDIO_TOO_LARGE'
  | 'AUDIO_UNSUPPORTED_TYPE'
  | 'AUDIO_EMPTY'
  | 'STT_PROVIDER_ERROR'
  | 'LLM_PROVIDER_ERROR'
  | 'LLM_OUTPUT_INVALID'
  | 'LLM_CONTEXT_TOO_LARGE'
  | 'TTS_PROVIDER_ERROR'
  | 'SOURCE_QUESTION_ID_UNKNOWN'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
