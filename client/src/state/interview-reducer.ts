import type { DecisionSignal, Evaluation, Turn } from '@/types/domain'

export type InterviewPhase =
  | 'idle'
  | 'requestingMic'
  | 'listening'
  | 'transcribing'
  | 'awaitingInterviewer'
  | 'speaking'
  | 'finished'
  | 'error'

export type InterviewState = {
  phase: InterviewPhase
  sessionId: string | null
  turns: Turn[]
  decisionSignal: DecisionSignal | null
  evaluation: Evaluation | null
  errorCode: string | null
  errorMessage: string | null
}

export type InterviewAction =
  | { type: 'START' }
  | { type: 'MIC_GRANTED' }
  | { type: 'MIC_DENIED' }
  | { type: 'AUDIO_READY' }
  | { type: 'STT_DONE' }
  | { type: 'ANSWER_ACCEPTED'; candidateTurn: Turn; nextTurn: Turn; decisionSignal: DecisionSignal | null }
  | { type: 'TTS_ENDED' }
  | { type: 'FINISHED'; candidateTurn: Turn; evaluation: Evaluation; decisionSignal: DecisionSignal | null }
  | { type: 'FAILED'; code: string; message: string }
  | { type: 'SESSION_CREATED'; sessionId: string; firstTurn: Turn }
  | { type: 'REHYDRATE'; sessionId: string; turns: Turn[]; decisionSignal: DecisionSignal | null }
  | { type: 'RETRY' }

export const initialState: InterviewState = {
  phase: 'idle',
  sessionId: null,
  turns: [],
  decisionSignal: null,
  evaluation: null,
  errorCode: null,
  errorMessage: null,
}

export function interviewReducer(state: InterviewState, action: InterviewAction): InterviewState {
  switch (action.type) {
    case 'START':
      if (state.phase !== 'idle' && state.phase !== 'error') return state
      return { ...state, phase: 'requestingMic', errorCode: null, errorMessage: null }

    case 'MIC_GRANTED':
      if (state.phase !== 'requestingMic') return state
      return { ...state, phase: 'listening' }

    case 'MIC_DENIED':
      return {
        ...state,
        phase: 'error',
        errorCode: 'MIC_DENIED',
        errorMessage: 'Microphone access denied.',
      }

    case 'SESSION_CREATED':
      return {
        ...state,
        sessionId: action.sessionId,
        turns: [...state.turns, action.firstTurn],
      }

    case 'AUDIO_READY':
      if (state.phase !== 'listening') return state
      return { ...state, phase: 'transcribing' }

    case 'STT_DONE':
      if (state.phase !== 'transcribing') return state
      return { ...state, phase: 'awaitingInterviewer' }

    case 'ANSWER_ACCEPTED':
      if (state.phase !== 'awaitingInterviewer') return state
      return {
        ...state,
        phase: 'speaking',
        turns: [...state.turns, action.candidateTurn, action.nextTurn],
        decisionSignal: action.decisionSignal ?? state.decisionSignal,
      }

    case 'TTS_ENDED':
      if (state.phase !== 'speaking') return state
      return { ...state, phase: 'listening' }

    case 'FINISHED':
      return {
        ...state,
        phase: 'finished',
        turns: [...state.turns, action.candidateTurn],
        evaluation: action.evaluation,
        decisionSignal: action.decisionSignal ?? state.decisionSignal,
      }

    case 'FAILED':
      return { ...state, phase: 'error', errorCode: action.code, errorMessage: action.message }

    case 'REHYDRATE':
      return {
        ...state,
        phase: 'listening',
        sessionId: action.sessionId,
        turns: action.turns,
        decisionSignal: action.decisionSignal,
        errorCode: null,
        errorMessage: null,
      }

    case 'RETRY':
      if (state.phase !== 'error') return state
      return { ...state, phase: 'idle', errorCode: null, errorMessage: null }

    default:
      return state
  }
}
