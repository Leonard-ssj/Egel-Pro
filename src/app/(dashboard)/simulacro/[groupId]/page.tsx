import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSimulacroState } from '@/modules/quiz/actions'
import { SimulacroBreak } from '@/modules/quiz/components/SimulacroBreak'
import { SimulacroSession } from '@/modules/quiz/components/SimulacroSession'
import { ROUTES } from '@/lib/constants/routes'
import { EXAM_CONFIG } from '@/lib/constants/egel'
import { QUESTION_CLIENT_COLS, attachStimuli } from '@/modules/quiz/lib/load-questions'
import type { QuizQuestionForClient } from '@/modules/quiz/types'

export const metadata: Metadata = { title: 'Simulacro EGEL' }

type Params = { groupId: string }

/**
 * Carga las preguntas (sin correct_answer/explanation) asignadas a una sesion
 * de simulacro. El orden se obtiene del campo order_in_quiz de quiz_answers,
 * que se setea cuando se crea la sesion.
 */
async function loadSessionQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<QuizQuestionForClient[]> {
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('question_id, order_in_quiz')
    .eq('session_id', sessionId)
    .order('order_in_quiz', { ascending: true })

  if (!answers || answers.length === 0) return []

  const ids = answers.map((a) => a.question_id)
  const { data: questions } = await supabase
    .from('questions')
    .select(QUESTION_CLIENT_COLS)
    .in('id', ids)

  const byId = new Map((questions ?? []).map((q) => [q.id, q]))
  const ordered = ids
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q)) as QuizQuestionForClient[]
  return attachStimuli(supabase, ordered)
}

type InitialAnswers = Record<
  string,
  { questionId: string; userAnswer: 'a' | 'b' | 'c' | null; isMarked: boolean; timeSpentSeconds: number }
>

/** Carga el avance guardado de una sesion (para hidratar cross-device). */
async function loadSessionAnswers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<InitialAnswers> {
  const { data } = await supabase
    .from('quiz_answers')
    .select('question_id, user_answer, is_marked, time_spent_seconds')
    .eq('session_id', sessionId)
  const map: InitialAnswers = {}
  for (const a of data ?? []) {
    if (!a.question_id) continue
    map[a.question_id] = {
      questionId: a.question_id,
      userAnswer: (a.user_answer ?? null) as 'a' | 'b' | 'c' | null,
      isMarked: Boolean(a.is_marked),
      timeSpentSeconds: a.time_spent_seconds ?? 0,
    }
  }
  return map
}

export default async function SimulacroGroupPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stateResult = await getSimulacroState({ simulacroGroupId: groupId })
  if (!stateResult.success) {
    notFound()
  }
  const state = stateResult.data

  // Estado: simulacro terminado -> ir a resultados
  if (state.nextAction === 'viewResults') {
    redirect(ROUTES.simulacro.results(groupId))
  }

  // Estado: sesion 1 in_progress -> renderizar QuizCard de sesion 1
  if (state.nextAction === 'continue1') {
    if (!state.session1) notFound()
    const [questions, initialAnswers] = await Promise.all([
      loadSessionQuestions(supabase, state.session1.id),
      loadSessionAnswers(supabase, state.session1.id),
    ])
    return (
      <div className="mx-auto max-w-3xl">
        <SimulacroSession
          sessionId={state.session1.id}
          simulacroGroupId={groupId}
          sessionNumber={1}
          questions={questions}
          timeLimitSeconds={
            state.session1.time_limit_seconds ?? EXAM_CONFIG.sessionDurationSeconds
          }
          startedAtMs={
            state.session1.started_at
              ? new Date(state.session1.started_at).getTime()
              : undefined
          }
          initialAnswers={initialAnswers}
          startIndex={state.session1.last_question_index ?? 0}
        />
      </div>
    )
  }

  // Estado: sesion 1 completada, sesion 2 sin crear -> mostrar SimulacroBreak
  if (state.nextAction === 'startSession2') {
    if (!state.session1) notFound()
    return <SimulacroBreak simulacroGroupId={groupId} session1={state.session1} />
  }

  // Estado: sesion 2 in_progress -> renderizar QuizCard de sesion 2
  if (state.nextAction === 'continue2') {
    if (!state.session2) notFound()
    const [questions, initialAnswers] = await Promise.all([
      loadSessionQuestions(supabase, state.session2.id),
      loadSessionAnswers(supabase, state.session2.id),
    ])
    return (
      <div className="mx-auto max-w-3xl">
        <SimulacroSession
          sessionId={state.session2.id}
          simulacroGroupId={groupId}
          sessionNumber={2}
          questions={questions}
          timeLimitSeconds={
            state.session2.time_limit_seconds ?? EXAM_CONFIG.sessionDurationSeconds
          }
          startedAtMs={
            state.session2.started_at
              ? new Date(state.session2.started_at).getTime()
              : undefined
          }
          initialAnswers={initialAnswers}
          startIndex={state.session2.last_question_index ?? 0}
        />
      </div>
    )
  }

  // Fallback (no deberia ocurrir)
  notFound()
}
