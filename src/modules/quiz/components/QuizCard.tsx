'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

import { GlassCard } from '@/components/ui/glass-card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { QuizTimer } from './QuizTimer'
import { QuizProgress } from './QuizProgress'
import { QuestionDisplay } from './QuestionDisplay'
import { OptionsList } from './OptionsList'
import { QuizControls } from './QuizControls'
import { QuestionFeedbackChips } from './QuestionFeedbackChips'
import { useQuizStore, type QuizAnswerState } from '@/modules/quiz/store/quiz-store'
import { useQuizTimer } from '@/modules/quiz/hooks/useQuizTimer'
import { useQuizAnswersRealtime } from '@/modules/quiz/hooks/useQuizAnswersRealtime'
import { submitAnswer, completeSession } from '@/modules/quiz/actions'
import { enqueueAnswer, flushQueue, queueSize } from '@/modules/quiz/lib/offline-queue'
import type { QuizQuestionForClient } from '@/modules/quiz/types'
import type { CorrectAnswer } from '@/types/global'
import { cn } from '@/lib/utils/cn'

type QuizCardProps = {
  sessionId: string
  questions: QuizQuestionForClient[]
  timeLimitSeconds: number | null
  /**
   * Inicio real de la sesion (ms epoch, tomado de la DB). El cronometro cuenta
   * desde aqui para que al retomar la sesion el tiempo siga corriendo de verdad
   * y no se reinicie. Si se omite, cae al store / Date.now() (modo offline).
   */
  startedAtMs?: number
  /**
   * Politica de salida:
   *  - 'pause': se puede pausar y salir (modo practica). La sesion queda
   *    in_progress y se retoma luego.
   *  - 'end-early': se puede terminar antes y ver resultado parcial (examenes).
   *  - 'none': no se puede salir (simulacro, replica del examen real).
   */
  exitPolicy?: 'pause' | 'end-early' | 'none'
  /** Avance ya guardado en la DB (para hidratar al abrir en otro dispositivo). */
  initialAnswers?: Record<string, QuizAnswerState>
  /** Indice de la ultima pregunta vista (para retomar donde iba). */
  startIndex?: number
}

export function QuizCard({
  sessionId,
  questions,
  timeLimitSeconds,
  startedAtMs,
  exitPolicy = 'end-early',
  initialAnswers,
  startIndex,
}: QuizCardProps) {
  const router = useRouter()
  const [isFinishing, startFinishing] = useTransition()
  const [direction, setDirection] = useState(1)

  const init = useQuizStore((s) => s.init)
  const currentIndex = useQuizStore((s) => s.currentIndex)
  const goToIndex = useQuizStore((s) => s.goToIndex)
  const next = useQuizStore((s) => s.next)
  const prev = useQuizStore((s) => s.prev)
  const answers = useQuizStore((s) => s.answers)
  const setAnswer = useQuizStore((s) => s.setAnswer)
  const toggleMark = useQuizStore((s) => s.toggleMark)
  const addTimeSpent = useQuizStore((s) => s.addTimeSpent)
  const answeredCount = useQuizStore(
    (s) => Object.values(s.answers).filter((a) => a.userAnswer !== null).length,
  )
  const markedCount = useQuizStore(
    (s) => Object.values(s.answers).filter((a) => a.isMarked).length,
  )

  // Inicializar el store al montar / cambiar sessionId, hidratando el avance
  // guardado en la DB (para retomar en cualquier dispositivo).
  useEffect(() => {
    init(sessionId, questions.length, initialAnswers, startIndex)
    // initialAnswers/startIndex son snapshots del server render; no re-inicializar por su identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, questions.length, init])

  // Sincronizacion en vivo entre dispositivos del mismo usuario.
  useQuizAnswersRealtime(sessionId)

  // Track tiempo por pregunta — guardar segundos cuando cambia el currentIndex
  const enterTimeRef = useRef<number>(Date.now())
  const lastQuestionIdRef = useRef<string | null>(null)
  const currentQuestion = questions[currentIndex]

  useEffect(() => {
    // Al cambiar de pregunta: acumular tiempo en la anterior
    if (
      lastQuestionIdRef.current &&
      lastQuestionIdRef.current !== currentQuestion?.id
    ) {
      const elapsed = Math.floor((Date.now() - enterTimeRef.current) / 1000)
      addTimeSpent(lastQuestionIdRef.current, elapsed)
    }
    enterTimeRef.current = Date.now()
    lastQuestionIdRef.current = currentQuestion?.id ?? null
  }, [currentIndex, currentQuestion?.id, addTimeSpent])

  // Timer
  const handleTimeUp = useCallback(() => {
    toast.warning('Se acabo el tiempo. Finalizando...')
    void handleFinish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Preferimos el inicio real de la DB (startedAtMs). Solo si no llega usamos
  // el del store persistido, y como ultimo recurso Date.now() (offline).
  const storeStartedAt = useQuizStore((s) => s.startedAt)
  const startedAt = startedAtMs ?? storeStartedAt ?? Date.now()
  const { remainingSeconds } = useQuizTimer({
    startedAt,
    timeLimitSeconds,
    onExpire: handleTimeUp,
  })

  // Avisos de tiempo: en examenes largos (simulacro) avisamos a 30/15/5/1 min.
  // Guardamos los umbrales ya disparados para no repetir el toast.
  const firedWarningsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (timeLimitSeconds === null) return
    const thresholds = [1800, 900, 300, 60] // 30, 15, 5, 1 min
    for (const t of thresholds) {
      if (t >= timeLimitSeconds) continue
      if (remainingSeconds <= t && !firedWarningsRef.current.has(t)) {
        firedWarningsRef.current.add(t)
        const mins = t / 60
        toast.warning(
          mins >= 1
            ? `Te queda${mins === 1 ? '' : 'n'} ${mins} minuto${mins === 1 ? '' : 's'} de examen`
            : 'Ultimos segundos',
          { duration: 6000 },
        )
      }
    }
  }, [remainingSeconds, timeLimitSeconds])

  // Submit en background al cambiar la respuesta / marca. Si falla la red,
  // encola en localStorage para reintentar al recuperar conexion.
  const submitInBackground = useCallback(
    async (questionId: string) => {
      const a = useQuizStore.getState().answers[questionId]
      if (!a) return
      const elapsed = Math.floor((Date.now() - enterTimeRef.current) / 1000)
      const payload = {
        sessionId,
        questionId,
        userAnswer: a.userAnswer,
        timeSpentSeconds: a.timeSpentSeconds + elapsed,
        orderInQuiz: currentIndex,
        isMarked: a.isMarked,
      }
      // Si el navegador esta offline, no intentamos siquiera.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueAnswer(payload)
        return
      }
      try {
        const res = await submitAnswer(payload)
        if (!res.success) enqueueAnswer(payload)
      } catch {
        enqueueAnswer(payload)
      }
    },
    [sessionId, currentIndex],
  )

  // Auto-sync: al recuperar conexion, vaciar la cola.
  useEffect(() => {
    function onOnline() {
      if (queueSize() === 0) return
      void flushQueue(submitAnswer).then((r) => {
        if (r.flushed > 0) toast.success(`Sincronizadas ${r.flushed} respuestas offline`)
        if (r.remaining > 0) toast.warning(`Quedan ${r.remaining} respuestas por sincronizar`)
      })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline)
      // Intento inicial al montar (por si volvio online antes de cargar la app)
      if (navigator.onLine && queueSize() > 0) onOnline()
      return () => window.removeEventListener('online', onOnline)
    }
  }, [])

  function handleSelect(answer: CorrectAnswer) {
    if (!currentQuestion) return
    setAnswer(currentQuestion.id, answer)
    void submitInBackground(currentQuestion.id)
  }

  function handleSkip() {
    if (!currentQuestion) return
    setAnswer(currentQuestion.id, null)
    void submitInBackground(currentQuestion.id)
    setDirection(1)
    next()
  }

  function handleToggleMark() {
    if (!currentQuestion) return
    toggleMark(currentQuestion.id)
    void submitInBackground(currentQuestion.id)
  }

  function handleNext() {
    if (currentQuestion) void submitInBackground(currentQuestion.id)
    setDirection(1)
    next()
  }

  function handlePrev() {
    if (currentQuestion) void submitInBackground(currentQuestion.id)
    setDirection(-1)
    prev()
  }

  function handleJumpTo(i: number) {
    setDirection(i > currentIndex ? 1 : -1)
    goToIndex(i)
  }

  async function ensureSynced() {
    if (currentQuestion) await submitInBackground(currentQuestion.id)
    if (queueSize() > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
      await flushQueue(submitAnswer)
    }
  }

  async function handleFinish() {
    await ensureSynced()
    startFinishing(async () => {
      const result = await completeSession({ sessionId, earlyEnd: false })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      useQuizStore.getState().reset()
      router.push(`/quiz/results/${sessionId}`)
      router.refresh()
    })
  }

  async function handlePause() {
    // Practica: guardar el avance (ya se sincroniza en background) y salir.
    // La sesion sigue in_progress, asi que el banner "Continuar" la retoma.
    await ensureSynced()
    toast.success('Practica pausada. Puedes retomarla cuando quieras.')
    router.push('/quiz')
    router.refresh()
  }

  async function handleEndEarly() {
    await ensureSynced()
    startFinishing(async () => {
      const result = await completeSession({ sessionId, earlyEnd: true })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      useQuizStore.getState().reset()
      router.push(`/quiz/results/${sessionId}`)
      router.refresh()
    })
  }

  if (!currentQuestion) {
    return (
      <GlassCard variant="elevated" padding="lg" className="text-center text-muted-foreground">
        No hay preguntas en esta sesion.
      </GlassCard>
    )
  }

  const currentAnswer = answers[currentQuestion.id]

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {/* Top bar: progress + timer */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <QuizProgress
            current={currentIndex}
            total={questions.length}
            answered={answeredCount}
            marked={markedCount}
          />
          <QuizTimer
            remainingSeconds={remainingSeconds}
            totalSeconds={timeLimitSeconds}
          />
        </div>

        {/* Main quiz card */}
        <GlassCard variant="elevated" padding="lg" className="overflow-hidden md:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 24 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <QuestionDisplay question={currentQuestion} />
              <OptionsList
                question={currentQuestion}
                selected={currentAnswer?.userAnswer ?? null}
                disabled={isFinishing}
                onSelect={handleSelect}
              />
              {/* Feedback de calidad de la pregunta (distinto de "Marcar"/bookmark).
                  El usuario reporta si la pregunta es floja: muy facil, respuestas
                  obvias, etc. Alimenta el contador en BD. */}
              <QuestionFeedbackChips questionId={currentQuestion.id} />
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        <QuizControls
          canPrev={currentIndex > 0}
          isLast={currentIndex === questions.length - 1}
          isMarked={currentAnswer?.isMarked ?? false}
          isFinishing={isFinishing}
          onPrev={handlePrev}
          onNext={handleNext}
          onSkip={handleSkip}
          onToggleMark={handleToggleMark}
          onFinish={handleFinish}
          onEndEarly={
            exitPolicy === 'end-early' && answeredCount > 0
              ? handleEndEarly
              : undefined
          }
          onPause={exitPolicy === 'pause' ? handlePause : undefined}
          answeredCount={answeredCount}
          total={questions.length}
        />

        {/* Mini-mapa para saltar a cualquier pregunta */}
        <GlassCard variant="flat" padding="md">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Mapa de preguntas</span>
            <div className="flex items-center gap-3">
              <Legend color="bg-brand-400" label="Actual" />
              <Legend color="bg-success" label="Respondida" />
              <Legend color="bg-warning" label="Marcada" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const ans = answers[q.id]
              const active = i === currentIndex
              const answered =
                ans?.userAnswer !== null && ans?.userAnswer !== undefined
              const marked = ans?.isMarked
              return (
                <Tooltip key={q.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleJumpTo(i)}
                      data-testid={`quiz-map-${i}`}
                      className={cn(
                        'h-8 w-8 rounded-md text-xs font-semibold transition-all duration-fast ease-out-expo',
                        'hover:scale-110',
                        active
                          ? 'bg-[linear-gradient(135deg,hsl(var(--aurora-1)),hsl(var(--aurora-2)))] text-white shadow-glow-brand ring-2 ring-aurora-2/50'
                          : marked
                            ? 'bg-warning/20 text-warning ring-1 ring-warning/40 hover:bg-warning/30'
                            : answered
                              ? 'bg-success/20 text-success ring-1 ring-success/40 hover:bg-success/30'
                              : 'bg-bg-raised/60 text-muted-foreground hover:bg-bg-border/80 hover:text-foreground',
                      )}
                    >
                      {i + 1}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Pregunta {i + 1}
                    {marked ? ' · marcada' : ''}
                    {answered && !marked ? ' · respondida' : ''}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </TooltipProvider>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span>{label}</span>
    </span>
  )
}
