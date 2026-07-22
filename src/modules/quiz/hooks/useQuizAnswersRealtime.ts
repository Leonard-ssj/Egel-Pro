'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuizStore } from '@/modules/quiz/store/quiz-store'
import type { CorrectAnswer } from '@/types/global'

type AnswerRow = {
  session_id: string
  question_id: string | null
  user_answer: string | null
  is_marked: boolean | null
}

/**
 * Suscribe el quiz a los cambios de sus respuestas en la DB (Supabase Realtime),
 * filtrando por session_id. Cuando el MISMO usuario responde en otro dispositivo,
 * el cambio llega aqui y actualiza el store -> el avance se sincroniza en vivo.
 *
 * La RLS (users_own_answers) garantiza que solo lleguen las respuestas propias.
 * Solo actualizamos el store (nunca reenviamos), asi no hay bucles de escritura.
 */
export function useQuizAnswersRealtime(sessionId: string) {
  const applyRemoteAnswer = useQuizStore((s) => s.applyRemoteAnswer)

  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`quiz-answers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = (payload.new ?? null) as AnswerRow | null
          if (!row || !row.question_id) return
          applyRemoteAnswer(
            row.question_id,
            (row.user_answer ?? null) as CorrectAnswer | null,
            Boolean(row.is_marked),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId, applyRemoteAnswer])
}
