export const ERROR_COPY: Record<string, string> = {
  VALIDATION_ERROR: "Something in your request looked off — please try again.",
  JOB_NOT_FOUND: "That job isn't available anymore. Back to the list.",
  SESSION_NOT_FOUND: "We couldn't find this interview. Start a new one?",
  SESSION_ALREADY_COMPLETED: "This interview is already finished. Here's your result.",
  SESSION_ABANDONED: "This session ended. Start a new one to try again.",
  TURN_OUT_OF_ORDER: "Give the interviewer a moment — try again in a sec.",
  AUDIO_TOO_LARGE: "That recording is too long. Keep answers under ~2 minutes.",
  AUDIO_UNSUPPORTED_TYPE: "Your browser's audio format isn't supported. Try Chrome.",
  AUDIO_EMPTY: "We didn't hear anything. Try recording again?",
  STT_PROVIDER_ERROR: "Couldn't transcribe that clip. Retry?",
  LLM_PROVIDER_ERROR: "The interviewer is taking a breather — please retry.",
  LLM_OUTPUT_INVALID: "The interviewer got tongue-tied — retry.",
  LLM_CONTEXT_TOO_LARGE: "The conversation got too long — please retry.",
  TTS_PROVIDER_ERROR: "Something went wrong on our end.",
  RATE_LIMITED: "Too many requests — take a short break and try again.",
  SOURCE_QUESTION_ID_UNKNOWN: "The interviewer got tongue-tied — retry.",
  INTERNAL_ERROR: "Something went wrong on our end.",
  // Client-only
  MIC_DENIED: "We need your microphone to continue. Enable it in your browser, or type your answer instead.",
}

export function getErrorCopy(code: string): string {
  return ERROR_COPY[code] ?? ERROR_COPY['INTERNAL_ERROR']!
}
