import type { Tables } from '@/types/database'
import type {
  QuizMode,
  QuizStatus,
  Section,
  CorrectAnswer,
  PerformanceLevel,
} from '@/types/global'

export type QuizSession = Tables<'quiz_sessions'>
export type QuizAnswer = Tables<'quiz_answers'>
export type Question = Tables<'questions'>
export type Stimulus = Tables<'stimuli'>

/**
 * Estimulo (texto base de un multirreactivo) tal como se envia al cliente.
 * Se usa en comprension lectora: un texto con varias preguntas asociadas.
 */
export type StimulusForClient = Pick<
  Stimulus,
  'id' | 'title' | 'body' | 'text_type'
>

/** Pregunta que se envia al cliente (sin la respuesta correcta) */
export type QuizQuestionForClient = Omit<Question, 'correct_answer' | 'explanation'> & {
  /** Sentinel para que TS impida que la respuesta llegue al cliente */
  __server_only?: never
  /** Texto base del multirreactivo (solo si la pregunta tiene stimulus_id) */
  stimulus?: StimulusForClient | null
}

/** Pregunta que el cliente puede ver al revisar (con respuesta) */
export type QuizQuestionWithAnswer = Question

export type StartQuizResult = {
  sessionId: string
  totalQuestions: number
  questions: QuizQuestionForClient[]
  mode: QuizMode
  timeLimitSeconds: number | null
}

export type SubmitAnswerResult = {
  isCorrect: boolean | null
  correctAnswer?: CorrectAnswer
  explanation?: string | null
}

export type CompleteSessionResult = {
  sessionId: string
  correct: number
  wrong: number
  skipped: number
  total: number
  scorePercent: number
  performanceLevel: PerformanceLevel
  isPerfectScore: boolean
  xpEarned: number
}

// =====================================================
// SIMULACRO TYPES
// =====================================================

export type StartSimulacroResult = {
  sessionId: string
  simulacroGroupId: string
  sessionNumber: 1 | 2
  totalQuestions: number
  /** True si ya existia un simulacro in_progress (la UI debe redirigir). */
  alreadyInProgress: boolean
}

export type SimulacroNextAction =
  | 'continue1'
  | 'startSession2'
  | 'continue2'
  | 'viewResults'

export type SimulacroCurrentSession = 'session1' | 'session2' | 'finished'

export type SimulacroState = {
  simulacroGroupId: string
  session1: QuizSession | null
  session2: QuizSession | null
  currentSession: SimulacroCurrentSession
  nextAction: SimulacroNextAction
}

export type { QuizMode, QuizStatus, Section }
