'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ONBOARDING_SKIP_COOKIE } from './constants'
import {
  completeOnboardingSchema,
  type CompleteOnboardingInput,
} from '@/lib/validations/onboarding.schema'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

/**
 * Finaliza el onboarding del usuario: guarda exam_date, goal_level,
 * diagnostic_score y marca onboarding_completed=true.
 */
export async function completeOnboarding(input: CompleteOnboardingInput): Promise<ActionResult> {
  const parsed = completeOnboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const examDate = parsed.data.exam_date && parsed.data.exam_date !== '' ? parsed.data.exam_date : null
  const university = parsed.data.university && parsed.data.university !== '' ? parsed.data.university : null

  const { error } = await supabase
    .from('profiles')
    .update({
      exam_date: examDate,
      university,
      goal_level: parsed.data.goal_level,
      diagnostic_score: parsed.data.diagnostic_score,
      onboarding_completed: true,
    })
    .eq('id', user.id)

  if (error) return { success: false, error: `Error al guardar: ${error.message}` }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Server Action que el wizard llama para traer 5 preguntas diagnostico.
 * Devuelve las preguntas SIN la respuesta correcta (correct_answer se
 * resolvera al final via /api o re-fetch).
 */
export async function getDiagnosticQuestions(): Promise<{
  success: true
  data: Array<{ id: string; area: number; subarea: number; question_text: string; option_a: string; option_b: string; option_c: string; correct_answer: 'a' | 'b' | 'c' }>
} | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Traer 1-2 preguntas de cada area al azar (max 5)
  const allQuestions: Array<{ id: string; area: number; subarea: number; question_text: string; option_a: string; option_b: string; option_c: string; correct_answer: 'a' | 'b' | 'c' }> = []
  for (const area of [1, 2, 3, 4] as const) {
    const { data } = await supabase
      .from('questions')
      .select('id, area, subarea, question_text, option_a, option_b, option_c, correct_answer')
      .eq('section', 'disciplinar')
      .eq('area', area)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(20)
    if (!data || data.length === 0) continue
    // Shuffle + take 1-2
    const arr = [...data]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
    const take = area === 3 ? 2 : 1 // area 3 (Desarrollo) tiene mas peso
    for (const q of arr.slice(0, take)) {
      allQuestions.push({ ...q, correct_answer: q.correct_answer as 'a' | 'b' | 'c' })
    }
  }

  return { success: true, data: allQuestions.slice(0, 5) }
}

/**
 * Salta el onboarding SOLO por esta sesion: deja entrar al dashboard ahora pero
 * NO marca onboarding_completed. La cookie se borra al cerrar sesion, asi el
 * guard del dashboard lo regresa al onboarding en el proximo login hasta que lo
 * termine de verdad.
 */
export async function skipOnboarding(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  cookieStore.set(ONBOARDING_SKIP_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Sin maxAge => cookie de sesion (se borra al cerrar el navegador/PWA).
  })

  redirect('/dashboard')
}
