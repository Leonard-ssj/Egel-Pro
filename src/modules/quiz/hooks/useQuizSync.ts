'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
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
 * Sincroniza un quiz/simulacro entre dispositivos del MISMO usuario, en vivo:
 *
 *  - Respuestas: postgres_changes sobre quiz_answers filtrado por session_id.
 *    Cuando el usuario responde/marca en otro dispositivo, el store se actualiza.
 *    La RLS (users_own_answers) garantiza que solo lleguen sus propias filas.
 *  - Posicion: broadcast efimero (event 'pos') con el indice de pregunta actual,
 *    para que ambos dispositivos vayan a la misma pregunta. No toca la DB.
 *
 * Devuelve `sendPosition` para emitir la posicion al navegar. Los cambios que
 * LLEGAN se aplican directo al store (goToIndex) sin re-emitir -> sin bucles.
 */
export function useQuizSync(sessionId: string) {
  const applyRemoteAnswer = useQuizStore((s) => s.applyRemoteAnswer)
  const goToIndex = useQuizStore((s) => s.goToIndex)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`quiz:${sessionId}`, { config: { broadcast: { self: false } } })
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
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        const idx = Number((payload as { index?: number } | null)?.index)
        // Aplicar directo al store (no re-emitir): evita el ping-pong entre equipos.
        if (Number.isFinite(idx)) goToIndex(idx)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [sessionId, applyRemoteAnswer, goToIndex])

  const sendPosition = useCallback((index: number) => {
    channelRef.current?.send({ type: 'broadcast', event: 'pos', payload: { index } })
  }, [])

  return { sendPosition }
}
