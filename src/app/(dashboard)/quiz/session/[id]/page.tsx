import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { GlassCard } from '@/components/ui/glass-card'
import { MagicButton } from '@/components/ui/magic-button'
import { QuizCard } from '@/modules/quiz/components/QuizCard'
import { getMyQuestionFeedback } from '@/modules/quiz/feedback-actions'
import { QUESTION_CLIENT_COLS, attachStimuli } from '@/modules/quiz/lib/load-questions'
import type { QuizQuestionForClient } from '@/modules/quiz/types'

export const metadata: Metadata = { title: 'Quiz en progreso' }

type Params = { id: string }

export default async function QuizSessionPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cargar sesion
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionError || !session) notFound()
  if (session.user_id !== user.id) notFound()

  if (session.status === 'completed') {
    redirect(`/quiz/results/${id}`)
  }

  // Cargar las preguntas seleccionadas. Estrategia de prioridad:
  //   1. Si la sesion ya tiene question_ids guardados (sesiones nuevas), usarlos
  //      en el orden exacto. Esto evita que un reload genere preguntas distintas
  //      (bug que "reiniciaba" el quiz visualmente).
  //   2. Si no, usar las preguntas asociadas a quiz_answers ya existentes
  //      (sesiones viejas que tienen respuestas pero sin question_ids).
  //   3. Fallback: traer preguntas que matchean los filtros, shuffled.
  let questions: QuizQuestionForClient[] = []

  const QUESTION_COLS = QUESTION_CLIENT_COLS

  const savedIds = (session.question_ids ?? null) as string[] | null

  if (savedIds && savedIds.length > 0) {
    // Camino feliz: IDs ya guardados al crear la sesion. Determinista al reload.
    const { data: qs } = await supabase
      .from('questions')
      .select(QUESTION_COLS)
      .in('id', savedIds)
    const byId = new Map((qs ?? []).map((q) => [q.id, q]))
    questions = savedIds
      .map((qid) => byId.get(qid))
      .filter((q): q is NonNullable<typeof q> => Boolean(q)) as QuizQuestionForClient[]
  } else {
    const { data: existingAnswers } = await supabase
      .from('quiz_answers')
      .select('question_id, order_in_quiz')
      .eq('session_id', id)
      .order('order_in_quiz', { ascending: true })

    if (existingAnswers && existingAnswers.length >= session.total_questions) {
      const ids = existingAnswers.map((a) => a.question_id)
      const { data: qs } = await supabase
        .from('questions')
        .select(QUESTION_COLS)
        .in('id', ids)
      const byId = new Map((qs ?? []).map((q) => [q.id, q]))
      questions = ids
        .map((qid) => byId.get(qid))
        .filter((q): q is NonNullable<typeof q> => Boolean(q)) as QuizQuestionForClient[]
    } else {
      // Primera carga: filtros + shuffle. Guardamos los IDs en la sesion para
      // que el proximo reload sea determinista.
      const areas = (session.areas ?? []) as number[]
      let query = supabase
        .from('questions')
        .select(QUESTION_COLS)
        .eq('is_active', true)
        .eq('is_deleted', false)
      if (areas.length > 0) query = query.in('area', areas)
      const { data: qs } = await query.limit(session.total_questions * 2)
      const arr = [...(qs ?? [])]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      }
      questions = arr.slice(0, session.total_questions) as QuizQuestionForClient[]
      // Persistir IDs para que la sesion sea determinista en futuros reloads
      if (questions.length > 0) {
        await supabase
          .from('quiz_sessions')
          .update({ question_ids: questions.map((q) => q.id) })
          .eq('id', id)
      }
    }
  }

  // Adjuntar el texto base a las preguntas de multirreactivo (comprension lectora).
  questions = await attachStimuli(supabase, questions)

  // Hidratar el avance ya guardado en la DB, para retomar el quiz en CUALQUIER
  // dispositivo (no solo en el que se empezo). Realtime lo mantiene en vivo.
  const { data: savedAnswers } = await supabase
    .from('quiz_answers')
    .select('question_id, user_answer, is_marked, time_spent_seconds')
    .eq('session_id', id)
  const initialAnswers: Record<
    string,
    { questionId: string; userAnswer: 'a' | 'b' | 'c' | null; isMarked: boolean; timeSpentSeconds: number }
  > = {}
  for (const a of savedAnswers ?? []) {
    if (!a.question_id) continue
    initialAnswers[a.question_id] = {
      questionId: a.question_id,
      userAnswer: (a.user_answer ?? null) as 'a' | 'b' | 'c' | null,
      isMarked: Boolean(a.is_marked),
      timeSpentSeconds: a.time_spent_seconds ?? 0,
    }
  }
  const startIndex = session.last_question_index ?? 0

  // Feedback de calidad ya marcado por el user (para precargar los chips y que
  // no "desaparezca" al navegar/recargar).
  const initialFeedback = await getMyQuestionFeedback(questions.map((q) => q.id))

  // Politica de salida por modo: en practica se puede pausar y salir; en los
  // examenes cronometrados se puede terminar antes; el simulacro no usa esta ruta.
  const exitPolicy: 'pause' | 'end-early' | 'none' =
    session.mode === 'practice' ? 'pause' : 'end-early'
  const startedAtMs = session.started_at
    ? new Date(session.started_at).getTime()
    : undefined

  if (questions.length === 0) {
    return (
      <GlassCard variant="elevated" padding="lg" className="mx-auto max-w-xl space-y-4 text-center">
        <p className="text-lg font-semibold">
          No se encontraron preguntas para esta sesion
        </p>
        <p className="text-sm text-muted-foreground">
          Probablemente no hay suficientes preguntas activas en las areas seleccionadas.
        </p>
        <MagicButton asChild variant="aurora">
          <Link href="/quiz">Volver al selector</Link>
        </MagicButton>
      </GlassCard>
    )
  }

  return (
    <div className="relative">
      <AuroraBackground variant="subtle" className="absolute inset-0 -z-10">
        <div className="h-full w-full" />
      </AuroraBackground>

      <div className="mx-auto max-w-3xl">
        <QuizCard
          sessionId={id}
          questions={questions}
          timeLimitSeconds={session.time_limit_seconds}
          startedAtMs={startedAtMs}
          exitPolicy={exitPolicy}
          initialAnswers={initialAnswers}
          startIndex={startIndex}
          initialFeedback={initialFeedback}
        />
      </div>
    </div>
  )
}
