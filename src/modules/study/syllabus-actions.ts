'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { startQuizSession } from '@/modules/quiz/actions'

const EXAM_ID = '11111111-1111-4111-8111-111111111111'

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const toggleSchema = z.object({
  conceptId: z.string().uuid(),
  mastered: z.boolean(),
})

/**
 * Marca o desmarca un concepto del temario como "dominado" por el usuario.
 * Idempotente: insertar si mastered=true, borrar si mastered=false.
 */
export async function toggleConceptMastery(
  input: z.infer<typeof toggleSchema>,
): Promise<ActionResult> {
  const parsed = toggleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Datos invalidos' }
  const { conceptId, mastered } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Necesitas iniciar sesion' }

  if (mastered) {
    const { error } = await supabase
      .from('user_concept_mastery')
      .upsert(
        { user_id: user.id, concept_id: conceptId, exam_id: EXAM_ID },
        { onConflict: 'user_id,concept_id' },
      )
    if (error) return { success: false, error: 'No se pudo guardar' }
  } else {
    const { error } = await supabase
      .from('user_concept_mastery')
      .delete()
      .eq('user_id', user.id)
      .eq('concept_id', conceptId)
    if (error) return { success: false, error: 'No se pudo guardar' }
  }

  revalidatePath('/study/mapa')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Borra todo el progreso del mapa del usuario (boton "Reiniciar").
 */
export async function resetSyllabusProgress(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Necesitas iniciar sesion' }

  const { error } = await supabase
    .from('user_concept_mastery')
    .delete()
    .eq('user_id', user.id)
  if (error) return { success: false, error: 'No se pudo reiniciar' }

  revalidatePath('/study/mapa')
  revalidatePath('/dashboard')
  return { success: true }
}

const practiceSchema = z.object({
  section: z.enum(['disciplinar', 'transversal']),
  area: z.number().int().min(1).max(4),
  subarea: z.number().int().min(1).max(5),
  totalQuestions: z.number().int().min(5).max(50).default(15),
})

/**
 * Lanza una practica enfocada en una subarea concreta del temario. Reutiliza el
 * motor de quiz (startQuizSession) — asi el mapa conecta directo con el
 * simulador. Devuelve el sessionId para que el cliente navegue a la sesion.
 */
export async function startSubareaPractice(
  input: z.infer<typeof practiceSchema>,
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = practiceSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Datos invalidos' }
  const { section, area, subarea, totalQuestions } = parsed.data

  const result = await startQuizSession({
    mode: 'practice',
    section,
    areas: [area],
    subareas: [subarea],
    totalQuestions,
    timeLimitSeconds: null,
    onlyUnseen: false,
  })

  if (!result.success) return { success: false, error: result.error }
  return { success: true, data: { sessionId: result.data.sessionId } }
}
