'use client'

import { QuizCard } from './QuizCard'
import { useBeforeUnload } from '@/modules/quiz/hooks/useBeforeUnload'
import { useSimulacro } from '@/modules/quiz/hooks/useSimulacro'
import type { QuizQuestionForClient } from '@/modules/quiz/types'
import type { QuizAnswerState } from '@/modules/quiz/store/quiz-store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

type SimulacroSessionProps = {
  sessionId: string
  simulacroGroupId: string
  sessionNumber: 1 | 2
  questions: QuizQuestionForClient[]
  timeLimitSeconds: number
  /** Inicio real de la sesion (ms epoch) para que el cronometro no se reinicie. */
  startedAtMs?: number
  /** Avance ya guardado (hidratacion cross-device). */
  initialAnswers?: Record<string, QuizAnswerState>
  startIndex?: number
}

/**
 * Wrapper de QuizCard especifico para el simulacro. Anade:
 *  - Advertencia nativa antes de cerrar la pestana (useBeforeUnload).
 *  - Banner indicando la sesion en curso (con tematizacion aurora).
 *  - Inicializacion del store via useSimulacro (mantiene la metadata del grupo).
 *
 * Reusamos toda la logica de quiz (timer, navegacion, submit en background)
 * sin duplicar codigo.
 */
export function SimulacroSession({
  sessionId,
  simulacroGroupId: _simulacroGroupId,
  sessionNumber,
  questions,
  timeLimitSeconds,
  startedAtMs,
  initialAnswers,
  startIndex,
}: SimulacroSessionProps) {
  // Mantener metadata del simulacro en el hook (init del store + memo).
  useSimulacro({
    sessionId,
    simulacroGroupId: _simulacroGroupId,
    sessionNumber,
    totalQuestions: questions.length,
  })

  // Activar la advertencia al cerrar/recargar la pestana mientras dure la sesion.
  useBeforeUnload(true)

  return (
    <div className="space-y-4">
      <Alert className="border-aurora-2/40 bg-aurora-2/10 backdrop-blur-md shadow-[0_0_24px_-6px_hsl(var(--aurora-2)/0.5)]">
        <AlertTriangle className="size-4 text-aurora-2" />
        <AlertTitle className="text-aurora">
          Simulacro en curso · Sesion {sessionNumber} de 2
        </AlertTitle>
        <AlertDescription className="text-sm">
          Tu progreso se guarda automaticamente. Si cierras la pestana podras retomar la sesion
          mas tarde, pero el cronometro continua corriendo.
        </AlertDescription>
      </Alert>

      <QuizCard
        sessionId={sessionId}
        questions={questions}
        timeLimitSeconds={timeLimitSeconds}
        startedAtMs={startedAtMs}
        exitPolicy="none"
        initialAnswers={initialAnswers}
        startIndex={startIndex}
      />
    </div>
  )
}
