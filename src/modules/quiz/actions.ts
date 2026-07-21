'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'
import {
  startQuizSchema,
  submitAnswerSchema,
  completeSessionSchema,
  abandonSessionSchema,
  startSimulacroSession2Schema,
  getSimulacroStateSchema,
  type StartQuizInput,
  type SubmitAnswerInput,
  type CompleteSessionInput,
  type AbandonSessionInput,
  type StartSimulacroSession2Input,
  type GetSimulacroStateInput,
} from '@/lib/validations/quiz.schema'
import { distributeQuestionsByArea, calculateScore, type AnsweredQuestion } from './lib/scoring'
import { shuffle } from './lib/shuffle'
import { processQuizCompletion } from '@/modules/gamification/actions'
import { getAreaById, EXAM_CONFIG } from '@/lib/constants/egel'
import type {
  StartQuizResult,
  SubmitAnswerResult,
  CompleteSessionResult,
  QuizQuestionForClient,
  QuizSession,
  StartSimulacroResult,
  SimulacroState,
} from './types'
import type { CorrectAnswer, MasteryLevel } from '@/types/global'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

const ERROR_MESSAGES = {
  notAuth: 'Necesitas iniciar sesion',
  notFound: 'Sesion de quiz no encontrada',
  notOwner: 'No tienes permiso para acceder a esta sesion',
  notInProgress: 'La sesion ya esta finalizada',
  noQuestions: 'No hay preguntas disponibles para los filtros seleccionados',
}

// =====================================================
// START QUIZ SESSION
// =====================================================
export async function startQuizSession(
  input: StartQuizInput,
): Promise<ActionResult<StartQuizResult>> {
  const parsed = startQuizSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  // CLEANUP: marcar como abandoned sesiones in_progress previas SIN respuestas.
  // Evita acumular sesiones zombi cuando el user inicia nueva.
  await markEmptyInProgressAsAbandoned(supabase, user.id)

  // Determinar areas y pesos. Si no se especifican, usar todas las del section.
  const areasToUse =
    data.areas.length > 0
      ? data.areas
      : data.section === 'disciplinar'
        ? [1, 2, 3, 4]
        : [1, 2]

  // MODO REVIEW: traer SOLO preguntas que el usuario ha fallado antes
  const selectedQuestions: QuizQuestionForClient[] = []

  if (data.mode === 'review') {
    // Trae IDs de sesiones del usuario primero, luego sus respuestas falladas
    const { data: userSessions, error: sessErr } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', user.id)
    if (sessErr) {
      return { success: false, error: `Error al consultar sesiones: ${sessErr.message}` }
    }
    const sessionIds = (userSessions ?? []).map((s) => s.id)
    if (sessionIds.length === 0) {
      return { success: false, error: 'Aun no tienes preguntas falladas para repasar. Completa al menos un quiz primero.' }
    }
    const { data: failedAnswers, error: failedErr } = await supabase
      .from('quiz_answers')
      .select('question_id')
      .in('session_id', sessionIds)
      .eq('is_correct', false)
    if (failedErr) {
      return { success: false, error: `Error al consultar fallidas: ${failedErr.message}` }
    }
    const failedIds = Array.from(new Set((failedAnswers ?? []).map((a) => a.question_id).filter((id): id is string => Boolean(id))))
    if (failedIds.length === 0) {
      return { success: false, error: 'Aun no tienes preguntas falladas para repasar. Completa al menos un quiz primero.' }
    }
    const { data: reviewCandidates, error: revErr } = await supabase
      .from('questions')
      .select('*')
      .in('id', failedIds)
      .eq('is_active', true)
      .eq('is_deleted', false)
    if (revErr) {
      return { success: false, error: `Error al consultar preguntas: ${revErr.message}` }
    }
    if (!reviewCandidates || reviewCandidates.length === 0) {
      return { success: false, error: 'Las preguntas falladas ya no estan disponibles.' }
    }
    const picked = shuffle(reviewCandidates).slice(0, data.totalQuestions)
    for (const q of picked) {
      const { correct_answer: _ca, explanation: _ex, ...safe } = q
      void _ca
      void _ex
      selectedQuestions.push(safe as QuizQuestionForClient)
    }
  } else {
    // Seleccion inteligente: priorizar preguntas que el user nunca ha contestado.
    // Modo `full_simulacro` NO usa este filtro (debe respetar distribucion oficial completa).
    const prioritizeUnseen = data.mode !== 'full_simulacro'

    // Construir set de IDs ya vistos por el user (any session previa, status != cancelled)
    const seenIds = new Set<string>()
    if (prioritizeUnseen) {
      const { data: userSessions } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('user_id', user.id)
      const sessionIds = (userSessions ?? []).map((s) => s.id)
      if (sessionIds.length > 0) {
        // Paginar por si hay muchas respuestas (limite Supabase ~1000)
        let from = 0
        const PAGE = 1000
        while (true) {
          const { data: answered } = await supabase
            .from('quiz_answers')
            .select('question_id')
            .in('session_id', sessionIds)
            .range(from, from + PAGE - 1)
          if (!answered || answered.length === 0) break
          for (const a of answered) if (a.question_id) seenIds.add(a.question_id)
          if (answered.length < PAGE) break
          from += PAGE
        }
      }
    }

    // Pesos para distribuir preguntas: cantidad oficial de reactivos por area
    const weights: Record<number, number> = {}
    for (const areaId of areasToUse) {
      const area = getAreaById(areaId, data.section)
      weights[areaId] = area?.totalQuestions ?? 1
    }
    const distribution = distributeQuestionsByArea(data.totalQuestions, weights)

    // Para cada area, traer candidatos y seleccionar N priorizando NO VISTAS
    for (const [areaIdStr, count] of Object.entries(distribution)) {
      if (count === 0) continue
      const areaId = Number(areaIdStr)

      let query = supabase
        .from('questions')
        .select('*')
        .eq('section', data.section)
        .eq('area', areaId)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (data.subareas.length > 0) {
        query = query.in('subarea', data.subareas)
      }

      const { data: candidates, error } = await query.limit(500)
      if (error) {
        return { success: false, error: `Error al consultar preguntas: ${error.message}` }
      }
      if (!candidates || candidates.length === 0) continue

      // Picking inteligente: primero las no vistas, luego completar con las ya vistas
      // Si onlyUnseen=true, NUNCA completar con seen (modo estricto).
      let picked: typeof candidates = []
      if (prioritizeUnseen && seenIds.size > 0) {
        const unseen = candidates.filter((c) => !seenIds.has(c.id))
        const seen = candidates.filter((c) => seenIds.has(c.id))
        const shuffledUnseen = shuffle(unseen)
        picked = shuffledUnseen.slice(0, count)
        if (picked.length < count && !data.onlyUnseen) {
          const shuffledSeen = shuffle(seen)
          picked = picked.concat(shuffledSeen.slice(0, count - picked.length))
        }
      } else {
        picked = shuffle(candidates).slice(0, count)
      }

      // Eliminar campos sensibles antes de enviar al cliente
      for (const q of picked) {
        const { correct_answer: _ca, explanation: _ex, ...safe } = q
        void _ca
        void _ex
        selectedQuestions.push(safe as QuizQuestionForClient)
      }
    }
  }

  if (selectedQuestions.length === 0) {
    return { success: false, error: ERROR_MESSAGES.noQuestions }
  }

  // Crear la sesion. Guardamos los question_ids en el orden seleccionado para
  // que al reabrir la sesion se devuelvan LAS MISMAS preguntas en EL MISMO orden
  // (sin esto, un shuffle nuevo en cada reload "reiniciaba" el quiz visualmente).
  const questionIdsOrdered = selectedQuestions.map((q) => q.id)
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      mode: data.mode,
      areas: areasToUse,
      subareas: data.subareas,
      total_questions: selectedQuestions.length,
      time_limit_seconds: data.timeLimitSeconds,
      status: 'in_progress',
      question_ids: questionIdsOrdered,
    })
    .select()
    .single()

  if (sessionError || !session) {
    return { success: false, error: `Error al crear sesion: ${sessionError?.message ?? 'desconocido'}` }
  }

  revalidatePath('/quiz')
  return {
    success: true,
    data: {
      sessionId: session.id,
      totalQuestions: selectedQuestions.length,
      questions: selectedQuestions,
      mode: data.mode,
      timeLimitSeconds: data.timeLimitSeconds,
    },
  }
}

// =====================================================
// SUBMIT ANSWER
// =====================================================
export async function submitAnswer(
  input: SubmitAnswerInput,
): Promise<ActionResult<SubmitAnswerResult>> {
  const parsed = submitAnswerSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  // Verificar ownership y status
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('id, user_id, status')
    .eq('id', data.sessionId)
    .single()

  if (sessionError || !session) return { success: false, error: ERROR_MESSAGES.notFound }
  if (session.user_id !== user.id) return { success: false, error: ERROR_MESSAGES.notOwner }
  if (session.status !== 'in_progress') return { success: false, error: ERROR_MESSAGES.notInProgress }

  // Obtener la respuesta correcta de la pregunta
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('correct_answer')
    .eq('id', data.questionId)
    .single()

  if (questionError || !question) {
    return { success: false, error: 'Pregunta no encontrada' }
  }

  const isCorrect =
    data.userAnswer === null ? null : data.userAnswer === question.correct_answer

  // Upsert (cambia respuesta si ya existia)
  const { error: upsertError } = await supabase
    .from('quiz_answers')
    .upsert(
      {
        session_id: data.sessionId,
        question_id: data.questionId,
        user_answer: data.userAnswer,
        is_correct: isCorrect,
        time_spent_seconds: data.timeSpentSeconds,
        order_in_quiz: data.orderInQuiz,
        is_marked: data.isMarked,
      },
      { onConflict: 'session_id,question_id' },
    )

  if (upsertError) {
    return { success: false, error: `Error al guardar respuesta: ${upsertError.message}` }
  }

  // Actualizar last_question_index en la sesion (para "resumir donde quedo")
  await supabase
    .from('quiz_sessions')
    .update({ last_question_index: data.orderInQuiz })
    .eq('id', data.sessionId)

  return {
    success: true,
    data: {
      isCorrect,
      // No devolvemos la correctAnswer aqui — solo se revela al completar la sesion
    },
  }
}

// =====================================================
// COMPLETE SESSION
// =====================================================
export async function completeSession(
  input: CompleteSessionInput,
): Promise<ActionResult<CompleteSessionResult>> {
  const parsed = completeSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }
  const { sessionId, earlyEnd } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  // Cargar sesion
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) return { success: false, error: ERROR_MESSAGES.notFound }
  if (session.user_id !== user.id) return { success: false, error: ERROR_MESSAGES.notOwner }
  if (session.status !== 'in_progress') return { success: false, error: ERROR_MESSAGES.notInProgress }

  // Cargar todas las respuestas + datos de las preguntas
  const { data: answers, error: answersError } = await supabase
    .from('quiz_answers')
    .select(`
      user_answer,
      is_correct,
      time_spent_seconds,
      questions ( id, area, subarea, correct_answer )
    `)
    .eq('session_id', sessionId)

  if (answersError) {
    return { success: false, error: `Error al cargar respuestas: ${answersError.message}` }
  }

  type AnswerWithQuestion = {
    user_answer: string | null
    is_correct: boolean | null
    time_spent_seconds: number | null
    questions: { id: string; area: number; subarea: number; correct_answer: string } | null
  }
  const rows = (answers ?? []) as unknown as AnswerWithQuestion[]

  // Construir array para calculateScore. Las preguntas sin respuesta cuentan
  // como skipped, asi que rellenamos con userAnswer=null hasta total_questions.
  // Si earlyEnd=true, el score se calcula SOLO sobre las contestadas (justo
  // al terminar anticipadamente).
  const answeredForScoring: AnsweredQuestion[] = rows
    .filter((r) => !earlyEnd || r.user_answer !== null)
    .map((r) => ({
      correctAnswer: (r.questions?.correct_answer ?? 'a') as CorrectAnswer,
      userAnswer: (r.user_answer ?? null) as CorrectAnswer | null,
    }))
  // Si no es early end, rellenar saltadas implicitas hasta total_questions original
  if (!earlyEnd) {
    while (answeredForScoring.length < session.total_questions) {
      answeredForScoring.push({ correctAnswer: 'a', userAnswer: null })
    }
  }

  const result = calculateScore(answeredForScoring)
  // En earlyEnd, el "total" real de la sesion es la cantidad de respuestas validas
  const finalTotalQuestions = earlyEnd ? answeredForScoring.length : session.total_questions

  // Tiempo total (segundos desde started_at hasta ahora)
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now()
  const timeTaken = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))

  // Marcar la sesion como completada. xp_earned se sobreescribe luego por
  // processQuizCompletion con el calculo final (con bonuses).
  const { error: updateError } = await supabase
    .from('quiz_sessions')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      total_questions: finalTotalQuestions,
      correct_answers: result.correct,
      wrong_answers: result.wrong,
      skipped: result.skipped,
      score_percent: result.scorePercent,
      estimated_level: result.performanceLevel,
      time_taken_seconds: timeTaken,
      xp_earned: 0, // placeholder, processQuizCompletion lo actualiza
    })
    .eq('id', sessionId)

  if (updateError) {
    return { success: false, error: `Error al cerrar sesion: ${updateError.message}` }
  }

  // Llamar al orchestrator de gamificacion: calcula XP final con bonuses,
  // actualiza level, recomputa streak, evalua logros nuevos.
  const gamification = await processQuizCompletion({ sessionId })
  const xpEarned = gamification.success ? gamification.data.xpEarned : 0

  // Upsert user_progress agrupando por (area, subarea)
  const progressBuckets = new Map<string, { area: number; subarea: number; attempted: number; correct: number }>()
  for (const r of rows) {
    if (!r.questions) continue
    const key = `${r.questions.area}-${r.questions.subarea}`
    const bucket = progressBuckets.get(key) ?? {
      area: r.questions.area,
      subarea: r.questions.subarea,
      attempted: 0,
      correct: 0,
    }
    bucket.attempted++
    if (r.is_correct === true) bucket.correct++
    progressBuckets.set(key, bucket)
  }

  for (const bucket of Array.from(progressBuckets.values())) {
    // Leer el progreso previo (acumulativo)
    const { data: prev } = await supabase
      .from('user_progress')
      .select('questions_attempted, questions_correct')
      .eq('user_id', user.id)
      .eq('area', bucket.area)
      .eq('subarea', bucket.subarea)
      .maybeSingle()

    const prevAttempted = prev?.questions_attempted ?? 0
    const prevCorrect = prev?.questions_correct ?? 0
    const newAttempted = prevAttempted + bucket.attempted
    const newCorrect = prevCorrect + bucket.correct
    const accuracy = newAttempted > 0 ? Math.round((newCorrect / newAttempted) * 10_000) / 100 : 0
    const mastery: MasteryLevel =
      newAttempted < 5
        ? 'untouched'
        : accuracy >= 90
          ? 'mastered'
          : accuracy >= 70
            ? 'familiar'
            : 'learning'

    await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: user.id,
          area: bucket.area,
          subarea: bucket.subarea,
          questions_attempted: newAttempted,
          questions_correct: newCorrect,
          accuracy_percent: accuracy,
          mastery_level: mastery,
          last_practiced: new Date().toISOString(),
        },
        { onConflict: 'user_id,area,subarea' },
      )
  }

  revalidatePath('/dashboard')
  revalidatePath('/progress')
  revalidatePath(`/quiz/results/${sessionId}`)

  return {
    success: true,
    data: {
      sessionId,
      correct: result.correct,
      wrong: result.wrong,
      skipped: result.skipped,
      total: result.total,
      scorePercent: result.scorePercent,
      performanceLevel: result.performanceLevel,
      isPerfectScore: result.isPerfectScore,
      xpEarned,
    },
  }
}

// =====================================================
// ABANDON SESSION (usuario cierra sin completar)
// =====================================================
export async function abandonSession(
  input: AbandonSessionInput,
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = abandonSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('user_id, status')
    .eq('id', parsed.data.sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    return { success: false, error: ERROR_MESSAGES.notFound }
  }
  if (session.status !== 'in_progress') {
    return { success: true, data: { sessionId: parsed.data.sessionId } }
  }

  await supabase
    .from('quiz_sessions')
    .update({ status: 'abandoned', finished_at: new Date().toISOString() })
    .eq('id', parsed.data.sessionId)

  revalidatePath('/dashboard')
  return { success: true, data: { sessionId: parsed.data.sessionId } }
}

// =====================================================
// GET ACTIVE QUIZ SESSION + CLEANUP HELPERS
// =====================================================

/**
 * Devuelve la sesion in_progress mas reciente del usuario actual, junto con
 * el conteo de respuestas. Para renderizar banner "Continuar quiz" en /quiz.
 *
 * - Excluye modo full_simulacro (usa su propio flujo en /simulacro).
 * - Si no hay sesion activa, retorna { success: true, data: null }.
 */
export async function getActiveQuizSession(): Promise<
  | {
      success: true
      data: {
        sessionId: string
        mode: string
        totalQuestions: number
        answeredCount: number
        startedAt: string | null
      } | null
    }
  | { success: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, mode, total_questions, started_at')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .neq('mode', 'full_simulacro')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) return { success: true, data: null }

  const { count } = await supabase
    .from('quiz_answers')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)

  return {
    success: true,
    data: {
      sessionId: session.id,
      mode: session.mode,
      totalQuestions: session.total_questions,
      answeredCount: count ?? 0,
      startedAt: session.started_at,
    },
  }
}

/**
 * Marca como abandoned todas las sesiones in_progress del usuario que:
 * - No tienen respuestas asociadas
 * - Fueron creadas hace mas de 30 minutos
 *
 * Helper interno usado al iniciar una nueva sesion y al cargar /quiz.
 * Recibe el supabase client ya con auth para evitar overhead.
 */
async function markEmptyInProgressAsAbandoned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: candidates } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .lt('started_at', thirtyMinAgo)

  if (!candidates || candidates.length === 0) return

  // Para cada candidata, verificar si tiene respuestas
  for (const c of candidates) {
    const { count } = await supabase
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', c.id)
    if ((count ?? 0) === 0) {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'abandoned', finished_at: new Date().toISOString() })
        .eq('id', c.id)
    }
  }
}

/**
 * Action que /quiz/page.tsx puede llamar para limpiar sesiones zombi del user.
 * Solo expone la version segura via Server Action.
 */
export async function cleanupEmptyInProgressSessions(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }
  await markEmptyInProgressAsAbandoned(supabase, user.id)
  return { success: true }
}

// =====================================================
// SIMULACRO COMPLETO EGEL (2 sesiones de 4.5h)
// =====================================================

// Distribucion oficial CENEVAL EGEL Plus ISOFT (203 reactivos):
//   Disciplinar: 31 (A1) + 33 (A2) + 49 (A3) + 30 (A4) = 143
//   Transversal: 30 (A1 Comprension lectora) + 30 (A2 Redaccion) = 60
//
// Repartimos el examen en 2 sesiones (102 + 101) respetando la distribucion
// oficial a nivel SUBAREA para las areas que no usan multirreactivos.
//
// Comprension lectora (transversal, area 1) se maneja aparte con `grouped`:
// se eligen TEXTOS completos (todas las preguntas de un mismo estimulo juntas)
// hasta acercarse al objetivo, porque un texto no se puede partir entre
// sesiones sin romper el multirreactivo. Por eso su conteo es aproximado.
type SimulacroSlot = {
  section: 'disciplinar' | 'transversal'
  area: number
  /** Subarea especifica (omitir en slots `grouped`, que cubren toda el area). */
  subarea?: number
  count: number
  /**
   * Si true, se eligen grupos de estimulo completos (multirreactivos) en vez de
   * preguntas sueltas. El conteo es un objetivo aproximado (no se parten textos).
   */
  grouped?: boolean
}

// Sesion 1: disciplinar 73 + transversal-2 15 + comprension lectora ~14 ≈ 102
const SIMULACRO_SESSION_1_SLOTS: readonly SimulacroSlot[] = [
  { section: 'disciplinar', area: 1, subarea: 1, count: 6 },
  { section: 'disciplinar', area: 1, subarea: 2, count: 5 },
  { section: 'disciplinar', area: 1, subarea: 3, count: 5 },
  { section: 'disciplinar', area: 2, subarea: 1, count: 5 },
  { section: 'disciplinar', area: 2, subarea: 2, count: 8 },
  { section: 'disciplinar', area: 2, subarea: 3, count: 4 },
  { section: 'disciplinar', area: 3, subarea: 1, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 2, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 3, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 4, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 5, count: 5 },
  { section: 'disciplinar', area: 4, subarea: 1, count: 4 },
  { section: 'disciplinar', area: 4, subarea: 2, count: 5 },
  { section: 'disciplinar', area: 4, subarea: 3, count: 6 },
  { section: 'transversal', area: 2, subarea: 1, count: 7 },
  { section: 'transversal', area: 2, subarea: 2, count: 8 },
  { section: 'transversal', area: 1, count: 14, grouped: true },
] as const

// Sesion 2: disciplinar 70 + transversal-2 15 + comprension lectora ~16 ≈ 101
const SIMULACRO_SESSION_2_SLOTS: readonly SimulacroSlot[] = [
  { section: 'disciplinar', area: 1, subarea: 1, count: 6 },
  { section: 'disciplinar', area: 1, subarea: 2, count: 4 },
  { section: 'disciplinar', area: 1, subarea: 3, count: 5 },
  { section: 'disciplinar', area: 2, subarea: 1, count: 5 },
  { section: 'disciplinar', area: 2, subarea: 2, count: 8 },
  { section: 'disciplinar', area: 2, subarea: 3, count: 3 },
  { section: 'disciplinar', area: 3, subarea: 1, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 2, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 3, count: 5 },
  { section: 'disciplinar', area: 3, subarea: 4, count: 4 },
  { section: 'disciplinar', area: 3, subarea: 5, count: 5 },
  { section: 'disciplinar', area: 4, subarea: 1, count: 4 },
  { section: 'disciplinar', area: 4, subarea: 2, count: 5 },
  { section: 'disciplinar', area: 4, subarea: 3, count: 6 },
  { section: 'transversal', area: 2, subarea: 1, count: 8 },
  { section: 'transversal', area: 2, subarea: 2, count: 7 },
  { section: 'transversal', area: 1, count: 16, grouped: true },
] as const

/**
 * Elige preguntas para un slot. Devuelve BLOQUES: cada bloque es un conjunto de
 * ids que deben permanecer consecutivos. Para slots normales cada pregunta es
 * su propio bloque; para slots `grouped` cada bloque es un texto completo
 * (multirreactivo) con todas sus preguntas.
 */
async function pickSlotBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slot: SimulacroSlot,
  excluded: Set<string>,
): Promise<{ ok: true; blocks: string[][] } | { ok: false; error: string }> {
  if (slot.grouped) {
    // Traer candidatos con su stimulus_id para agrupar por texto.
    const { data, error } = await supabase
      .from('questions')
      .select('id, stimulus_id')
      .eq('section', slot.section)
      .eq('area', slot.area)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(1000)
    if (error) {
      return { ok: false, error: `Error al consultar preguntas: ${error.message}` }
    }
    const available = (data ?? []).filter((q) => !excluded.has(q.id))
    // Agrupar por stimulus_id (las sueltas —sin estimulo— van como grupo propio)
    const groups = new Map<string, string[]>()
    for (const q of available) {
      const key = q.stimulus_id ?? `solo:${q.id}`
      const arr = groups.get(key) ?? []
      arr.push(q.id)
      groups.set(key, arr)
    }
    const shuffledGroups = shuffle(Array.from(groups.values()))
    const blocks: string[][] = []
    let taken = 0
    for (const group of shuffledGroups) {
      if (taken >= slot.count) break
      blocks.push(group)
      group.forEach((id) => excluded.add(id))
      taken += group.length
    }
    if (blocks.length === 0) {
      return {
        ok: false,
        error: `No hay textos disponibles para comprension lectora (seccion ${slot.section} area ${slot.area})`,
      }
    }
    return { ok: true, blocks }
  }

  // Slot normal: preguntas sueltas de una subarea concreta.
  let query = supabase
    .from('questions')
    .select('id')
    .eq('section', slot.section)
    .eq('area', slot.area)
    .eq('is_active', true)
    .eq('is_deleted', false)
  if (slot.subarea !== undefined) query = query.eq('subarea', slot.subarea)

  const { data, error } = await query.limit(1000)
  if (error) {
    return { ok: false, error: `Error al consultar preguntas: ${error.message}` }
  }
  const available = (data ?? []).filter((q) => !excluded.has(q.id))
  if (available.length === 0) {
    return {
      ok: false,
      error: `No hay preguntas disponibles para seccion ${slot.section} area ${slot.area}${slot.subarea ? ` subarea ${slot.subarea}` : ''}`,
    }
  }
  const picked = shuffle(available).slice(0, slot.count)
  for (const q of picked) excluded.add(q.id)
  return { ok: true, blocks: picked.map((q) => [q.id]) }
}

/**
 * Selecciona preguntas segun los slots y las persiste como filas de
 * quiz_answers (placeholders) para fijar el conjunto a la sesion.
 *
 * Devuelve los IDs en el orden guardado. Los multirreactivos quedan juntos:
 * barajamos los BLOQUES (no las preguntas), asi el examen no muestra las
 * preguntas agrupadas por area pero si mantiene cada texto con sus preguntas.
 *
 * Si excludeIds esta provisto, evita re-seleccionar preguntas ya usadas (caso
 * tipico: las de la sesion 1 cuando armamos la sesion 2).
 */
async function pickAndPersistSimulacroQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  slots: readonly SimulacroSlot[],
  excludeIds: readonly string[] = [],
): Promise<{ ok: true; questionIds: string[] } | { ok: false; error: string }> {
  const excluded = new Set(excludeIds)
  const allBlocks: string[][] = []

  for (const slot of slots) {
    if (slot.count === 0) continue
    const result = await pickSlotBlocks(supabase, slot, excluded)
    if (!result.ok) return result
    allBlocks.push(...result.blocks)
  }

  if (allBlocks.length === 0) {
    return { ok: false, error: 'No hay preguntas disponibles para el simulacro' }
  }

  // Barajar los BLOQUES (preserva los multirreactivos consecutivos) y aplanar.
  const finalOrder = shuffle(allBlocks).flat()

  const rows = finalOrder.map((qid, idx) => ({
    session_id: sessionId,
    question_id: qid,
    user_answer: null,
    is_correct: null,
    time_spent_seconds: 0,
    order_in_quiz: idx,
    is_marked: false,
  }))

  // Insertamos en lotes para evitar payload gigantes.
  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const { error: insertError } = await supabase
      .from('quiz_answers')
      .upsert(slice, { onConflict: 'session_id,question_id' })
    if (insertError) {
      return { ok: false, error: `Error al guardar preguntas: ${insertError.message}` }
    }
  }

  return { ok: true, questionIds: finalOrder }
}

/**
 * Crea la sesion 1 del simulacro completo. Asigna un simulacro_group_id que
 * vincula ambas sesiones del mismo simulacro.
 */
export async function startSimulacroFullExam(): Promise<ActionResult<StartSimulacroResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  // Evitar simulacros duplicados in_progress
  const { data: existing } = await supabase
    .from('quiz_sessions')
    .select('simulacro_group_id, status')
    .eq('user_id', user.id)
    .eq('mode', 'full_simulacro')
    .eq('status', 'in_progress')
    .not('simulacro_group_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (existing?.simulacro_group_id) {
    return {
      success: true,
      data: {
        sessionId: '',
        simulacroGroupId: existing.simulacro_group_id,
        sessionNumber: 1,
        totalQuestions: 0,
        alreadyInProgress: true,
      },
    }
  }

  const simulacroGroupId = randomUUID()
  const totalSession1 = SIMULACRO_SESSION_1_SLOTS.reduce((acc, s) => acc + s.count, 0)

  // Crear la sesion 1
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      mode: 'full_simulacro',
      session_number: 1,
      simulacro_group_id: simulacroGroupId,
      areas: [1, 2, 3, 4],
      subareas: [],
      total_questions: totalSession1,
      time_limit_seconds: EXAM_CONFIG.sessionDurationSeconds,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    return {
      success: false,
      error: `Error al crear sesion: ${sessionError?.message ?? 'desconocido'}`,
    }
  }

  const picked = await pickAndPersistSimulacroQuestions(
    supabase,
    session.id,
    SIMULACRO_SESSION_1_SLOTS,
  )
  if (!picked.ok) {
    // Rollback simple: marcar la sesion como abandonada para no dejar basura
    await supabase
      .from('quiz_sessions')
      .update({ status: 'abandoned', finished_at: new Date().toISOString() })
      .eq('id', session.id)
    return { success: false, error: picked.error }
  }

  // Ajustar total_questions al real si hubo deficit
  if (picked.questionIds.length !== totalSession1) {
    await supabase
      .from('quiz_sessions')
      .update({ total_questions: picked.questionIds.length })
      .eq('id', session.id)
  }

  revalidatePath('/simulacro')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: {
      sessionId: session.id,
      simulacroGroupId,
      sessionNumber: 1,
      totalQuestions: picked.questionIds.length,
      alreadyInProgress: false,
    },
  }
}

/**
 * Crea la sesion 2 del simulacro, vinculada al mismo simulacro_group_id.
 * Requiere que la sesion 1 ya este completada para ese grupo.
 */
export async function startSimulacroSession2(
  input: StartSimulacroSession2Input,
): Promise<ActionResult<StartSimulacroResult>> {
  const parsed = startSimulacroSession2Schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }
  const { simulacroGroupId } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  // Cargar las sesiones existentes del grupo
  const { data: sessions, error: sessionsError } = await supabase
    .from('quiz_sessions')
    .select('id, user_id, status, session_number')
    .eq('simulacro_group_id', simulacroGroupId)
    .order('session_number', { ascending: true })

  if (sessionsError) {
    return { success: false, error: `Error al cargar simulacro: ${sessionsError.message}` }
  }
  if (!sessions || sessions.length === 0) {
    return { success: false, error: 'Simulacro no encontrado' }
  }

  // Ownership
  if (sessions[0]?.user_id !== user.id) {
    return { success: false, error: ERROR_MESSAGES.notOwner }
  }

  const session1 = sessions.find((s) => s.session_number === 1)
  const existingSession2 = sessions.find((s) => s.session_number === 2)

  if (!session1) {
    return { success: false, error: 'No existe sesion 1 para este simulacro' }
  }
  if (session1.status !== 'completed') {
    return { success: false, error: 'Debes completar la sesion 1 antes de iniciar la sesion 2' }
  }

  // Si ya existe sesion 2 (in_progress o completed), devolverla
  if (existingSession2) {
    if (existingSession2.status === 'in_progress' || existingSession2.status === 'completed') {
      // Cargar count desde quiz_answers (no devolvemos questions aqui).
      return {
        success: true,
        data: {
          sessionId: existingSession2.id,
          simulacroGroupId,
          sessionNumber: 2,
          totalQuestions: 0,
          alreadyInProgress: true,
        },
      }
    }
  }

  // Cargar IDs de preguntas usadas en sesion 1 para no repetirlas
  const { data: usedAnswers } = await supabase
    .from('quiz_answers')
    .select('question_id')
    .eq('session_id', session1.id)
  const usedIds = (usedAnswers ?? []).map((a) => a.question_id)

  const totalSession2 = SIMULACRO_SESSION_2_SLOTS.reduce((acc, s) => acc + s.count, 0)

  // Crear sesion 2
  const { data: newSession, error: createError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      mode: 'full_simulacro',
      session_number: 2,
      simulacro_group_id: simulacroGroupId,
      areas: [1, 2, 3, 4],
      subareas: [],
      total_questions: totalSession2,
      time_limit_seconds: EXAM_CONFIG.sessionDurationSeconds,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (createError || !newSession) {
    return {
      success: false,
      error: `Error al crear sesion 2: ${createError?.message ?? 'desconocido'}`,
    }
  }

  const picked = await pickAndPersistSimulacroQuestions(
    supabase,
    newSession.id,
    SIMULACRO_SESSION_2_SLOTS,
    usedIds,
  )
  if (!picked.ok) {
    await supabase
      .from('quiz_sessions')
      .update({ status: 'abandoned', finished_at: new Date().toISOString() })
      .eq('id', newSession.id)
    return { success: false, error: picked.error }
  }

  if (picked.questionIds.length !== totalSession2) {
    await supabase
      .from('quiz_sessions')
      .update({ total_questions: picked.questionIds.length })
      .eq('id', newSession.id)
  }

  revalidatePath(`/simulacro/${simulacroGroupId}`)
  revalidatePath('/dashboard')

  return {
    success: true,
    data: {
      sessionId: newSession.id,
      simulacroGroupId,
      sessionNumber: 2,
      totalQuestions: picked.questionIds.length,
      alreadyInProgress: false,
    },
  }
}

/**
 * Devuelve el estado actual del simulacro: que sesiones existen, en que estado
 * estan, y cual es la siguiente accion que debe tomar la UI.
 */
export async function getSimulacroState(
  input: GetSimulacroStateInput,
): Promise<ActionResult<SimulacroState>> {
  const parsed = getSimulacroStateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }
  const { simulacroGroupId } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  const { data: sessions, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('simulacro_group_id', simulacroGroupId)
    .order('session_number', { ascending: true })

  if (error) {
    return { success: false, error: `Error al cargar simulacro: ${error.message}` }
  }
  if (!sessions || sessions.length === 0) {
    return { success: false, error: 'Simulacro no encontrado' }
  }
  if (sessions[0]?.user_id !== user.id) {
    return { success: false, error: ERROR_MESSAGES.notOwner }
  }

  const session1 = (sessions.find((s) => s.session_number === 1) ?? null) as QuizSession | null
  const session2 = (sessions.find((s) => s.session_number === 2) ?? null) as QuizSession | null

  let currentSession: SimulacroState['currentSession'] = 'session1'
  let nextAction: SimulacroState['nextAction'] = 'continue1'

  if (!session1) {
    // No deberia pasar (siempre creamos session1 primero), pero por seguridad
    nextAction = 'continue1'
  } else if (session1.status === 'in_progress') {
    currentSession = 'session1'
    nextAction = 'continue1'
  } else if (session1.status === 'completed' && !session2) {
    currentSession = 'session2'
    nextAction = 'startSession2'
  } else if (session1.status === 'completed' && session2?.status === 'in_progress') {
    currentSession = 'session2'
    nextAction = 'continue2'
  } else if (session1.status === 'completed' && session2?.status === 'completed') {
    currentSession = 'finished'
    nextAction = 'viewResults'
  } else if (session1.status === 'abandoned') {
    // Si la sesion 1 fue abandonada el simulacro queda truncado.
    currentSession = 'finished'
    nextAction = 'viewResults'
  }

  return {
    success: true,
    data: {
      simulacroGroupId,
      session1,
      session2,
      currentSession,
      nextAction,
    },
  }
}

/**
 * Inicia una practica enfocada en las areas mas debiles del usuario (menor
 * precision en user_progress). Reutiliza startQuizSession. Si el usuario aun no
 * tiene progreso, cae a todas las areas.
 */
export async function startWeakAreasQuiz(
  totalQuestions = 20,
): Promise<ActionResult<StartQuizResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ERROR_MESSAGES.notAuth }

  const { data: progress } = await supabase
    .from('user_progress')
    .select('area, questions_attempted, questions_correct')
    .eq('user_id', user.id)

  const byArea = new Map<number, { attempted: number; correct: number }>()
  for (const p of progress ?? []) {
    if (p.area < 1 || p.area > 4) continue
    const b = byArea.get(p.area) ?? { attempted: 0, correct: 0 }
    b.attempted += p.questions_attempted ?? 0
    b.correct += p.questions_correct ?? 0
    byArea.set(p.area, b)
  }
  // Las 2 areas con menor precision (con al menos un intento). Vacio = todas.
  const weakAreas = Array.from(byArea.entries())
    .filter(([, b]) => b.attempted > 0)
    .map(([area, b]) => ({ area, acc: b.correct / b.attempted }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 2)
    .map((r) => r.area)

  return startQuizSession({
    mode: 'practice',
    section: 'disciplinar',
    areas: weakAreas,
    subareas: [],
    totalQuestions,
    timeLimitSeconds: null,
    onlyUnseen: false,
  })
}
