import type { createClient } from '@/lib/supabase/server'
import type { QuizQuestionForClient, StimulusForClient } from '@/modules/quiz/types'

/**
 * Columnas de `questions` seguras para el cliente (todo MENOS correct_answer y
 * explanation). Incluye la media del enunciado (diagram, image_url) y de cada
 * opcion (option_X_image / option_X_diagram) para que diagramas e imagenes se
 * rendericen igual que en el examen real.
 *
 * IMPORTANTE: mantener esta lista como fuente unica. Antes cada loader repetia
 * un subset que omitia la media, por lo que diagramas/imagenes nunca aparecian
 * durante el quiz ni el simulacro.
 */
export const QUESTION_CLIENT_COLS =
  'id, section, area, area_name, subarea, subarea_name, type, stimulus_id, question_text, option_a, option_b, option_c, image_url, diagram, option_a_image, option_b_image, option_c_image, option_a_diagram, option_b_diagram, option_c_diagram, difficulty, tags, times_seen, times_correct, is_active, is_pilot, is_deleted, created_by, created_at, updated_at' as const

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Adjunta a cada pregunta su estimulo (texto del multirreactivo) cuando tiene
 * stimulus_id. Hace una sola consulta a `stimuli` con los ids distintos.
 *
 * Comprension lectora (transversal, area 1) usa multirreactivos: un texto base
 * con varias preguntas. Sin esto, el sustentante veria preguntas que hacen
 * referencia a "el texto anterior" sin poder leerlo.
 */
export async function attachStimuli(
  supabase: SupabaseServerClient,
  questions: QuizQuestionForClient[],
): Promise<QuizQuestionForClient[]> {
  const stimulusIds = Array.from(
    new Set(
      questions
        .map((q) => q.stimulus_id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  if (stimulusIds.length === 0) return questions

  const { data: stimuli } = await supabase
    .from('stimuli')
    .select('id, title, body, text_type')
    .in('id', stimulusIds)

  const byId = new Map<string, StimulusForClient>(
    (stimuli ?? []).map((s) => [s.id, s as StimulusForClient]),
  )

  return questions.map((q) =>
    q.stimulus_id && byId.has(q.stimulus_id)
      ? { ...q, stimulus: byId.get(q.stimulus_id) ?? null }
      : q,
  )
}
